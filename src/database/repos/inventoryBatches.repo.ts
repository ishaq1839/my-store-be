import { getDb } from "../firestoreAdmin";

export type InventoryBatchRecord = {
  batch_id: string;
  created_at: string;
  created_by: string;
  retail_price: number;
  sale_price: number | null;
  quantity_total: number;
  quantity_remaining: number;
};

function batchesCol(store_uuid: string, item_id: string) {
  return getDb().collection("stores").doc(String(store_uuid)).collection("items").doc(String(item_id)).collection("batches");
}

export async function addBatch(input: {
  store_uuid: string;
  item_id: string;
  created_by: string;
  retail_price: number;
  sale_price: number | null;
  quantity_total: number;
}): Promise<{ batch: InventoryBatchRecord }> {
  const batchId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-b-${Math.random()}`;
  const now = new Date().toISOString();
  const batch: InventoryBatchRecord = {
    batch_id: batchId,
    created_at: now,
    created_by: String(input.created_by),
    retail_price: input.retail_price,
    sale_price: input.sale_price,
    quantity_total: input.quantity_total,
    quantity_remaining: input.quantity_total,
  };
  await batchesCol(input.store_uuid, input.item_id).doc(batchId).set(batch);
  return { batch };
}

export async function listBatchesDesc(store_uuid: string, item_id: string): Promise<InventoryBatchRecord[]> {
  const snap = await batchesCol(store_uuid, item_id).orderBy("created_at", "desc").get();
  return snap.docs.map((d) => d.data() as InventoryBatchRecord);
}

export async function listBatchesAsc(store_uuid: string, item_id: string): Promise<InventoryBatchRecord[]> {
  const snap = await batchesCol(store_uuid, item_id).orderBy("created_at", "asc").get();
  return snap.docs.map((d) => d.data() as InventoryBatchRecord);
}

/** Only batches with stock left — smaller reads for bill preview. Sorted FIFO by created_at. */
export async function listActiveBatchesAsc(store_uuid: string, item_id: string): Promise<InventoryBatchRecord[]> {
  const snap = await batchesCol(store_uuid, item_id).where("quantity_remaining", ">", 0).get();
  return snap.docs
    .map((d) => d.data() as InventoryBatchRecord)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export async function listBatchesAscForItems(
  store_uuid: string,
  item_ids: string[],
): Promise<Map<string, InventoryBatchRecord[]>> {
  const uniqueIds = [...new Set(item_ids.map((id) => String(id).trim()).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const entries = await Promise.all(
    uniqueIds.map(async (item_id) => {
      const batches = await listBatchesAsc(store_uuid, item_id);
      return [item_id, batches] as const;
    }),
  );

  return new Map(entries);
}

export async function listActiveBatchesAscForItems(
  store_uuid: string,
  item_ids: string[],
): Promise<Map<string, InventoryBatchRecord[]>> {
  const uniqueIds = [...new Set(item_ids.map((id) => String(id).trim()).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const entries = await Promise.all(
    uniqueIds.map(async (item_id) => {
      const batches = await listActiveBatchesAsc(store_uuid, item_id);
      return [item_id, batches] as const;
    }),
  );

  return new Map(entries);
}

export async function aggregateBatches(store_uuid: string, item_id: string): Promise<{
  total_remaining: number;
  newest_batch: InventoryBatchRecord | null;
}> {
  const batches = await listBatchesAsc(store_uuid, item_id);
  let total_remaining = 0;
  let newest: InventoryBatchRecord | null = null;
  for (const b of batches) {
    total_remaining += Math.max(0, Math.floor(Number(b.quantity_remaining) || 0));
    if (!newest || b.created_at > newest.created_at) newest = b;
  }
  return { total_remaining, newest_batch: newest };
}

/**
 * Apply new prices for future sales without mutating historical batch price fields
 * (past bills keep their line snapshots). Remaining stock is moved into a new batch.
 * Optional total_items overrides the new remaining quantity for stock items.
 */
export async function repriceItemBatchesInTransaction(input: {
  store_uuid: string;
  item_id: string;
  created_by: string;
  retail_price: number;
  sale_price: number | null;
  is_service: boolean;
  /** When set for stock items, becomes the new quantity_remaining (old rem zeroed). */
  total_items?: number;
}): Promise<{ batch_id: string; repriced_quantity: number; previous_quantity: number }> {
  const db = getDb();
  const itemRef = db
    .collection("stores")
    .doc(String(input.store_uuid))
    .collection("items")
    .doc(String(input.item_id));

  return db.runTransaction(async (tx) => {
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists) {
      throw Object.assign(new Error("Item not found"), { code: "ITEM_NOT_FOUND" });
    }

    const batchesSnap = await tx.get(batchesCol(input.store_uuid, input.item_id).orderBy("created_at", "asc"));
    let previous_quantity = 0;

    for (const doc of batchesSnap.docs) {
      const data = doc.data() as InventoryBatchRecord;
      const rem = Math.max(0, Math.floor(Number(data.quantity_remaining) || 0));
      previous_quantity += rem;
      if (!input.is_service && rem > 0) {
        tx.update(doc.ref, { quantity_remaining: 0 });
      }
    }

    const batchId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-b-${Math.random()}`;
    const now = new Date().toISOString();

    let batchQuantity = 0;
    if (input.is_service) {
      batchQuantity = 0;
    } else if (input.total_items != null && Number.isFinite(Number(input.total_items))) {
      batchQuantity = Math.max(0, Math.floor(Number(input.total_items)));
    } else {
      batchQuantity = previous_quantity;
    }

    const batch: InventoryBatchRecord = {
      batch_id: batchId,
      created_at: now,
      created_by: String(input.created_by),
      retail_price: input.retail_price,
      sale_price: input.sale_price,
      quantity_total: batchQuantity,
      quantity_remaining: batchQuantity,
    };

    tx.set(batchesCol(input.store_uuid, input.item_id).doc(batchId), batch);
    tx.update(itemRef, {
      total_items: input.is_service ? 0 : batchQuantity,
      current_retail_price: input.retail_price,
      current_sale_price: input.sale_price,
    });

    return { batch_id: batchId, repriced_quantity: batchQuantity, previous_quantity };
  });
}

export type SellBatchLine = {
  batch_id: string;
  quantity: number;
  retail_price: number;
  sale_price: number | null;
};

export async function sellFifoFromBatches(input: {
  store_uuid: string;
  item_id: string;
  quantity: number;
}): Promise<{
  sold: number;
  batches: SellBatchLine[];
  remaining_total: number;
}> {
  const db = getDb();
  const { quantity } = input;
  if (quantity <= 0) throw new Error("quantity must be positive");

  const itemRef = db.collection("stores").doc(String(input.store_uuid)).collection("items").doc(String(input.item_id));

  return db.runTransaction(async (tx) => {
    const batchesSnap = await tx.get(batchesCol(input.store_uuid, input.item_id).orderBy("created_at", "asc"));
    const batchDocs = batchesSnap.docs;

    let available = 0;
    let newest: InventoryBatchRecord | null = null;
    for (const doc of batchDocs) {
      const data = doc.data() as InventoryBatchRecord;
      available += Math.max(0, Math.floor(Number(data.quantity_remaining) || 0));
      if (!newest || data.created_at > newest.created_at) newest = data;
    }

    if (available < quantity) {
      throw Object.assign(new Error("Insufficient stock"), { code: "INSUFFICIENT_STOCK" });
    }

    let remainingToSell = quantity;
    const lines: SellBatchLine[] = [];

    for (const doc of batchDocs) {
      if (remainingToSell <= 0) break;
      const data = doc.data() as InventoryBatchRecord;
      const rem = Math.max(0, Math.floor(Number(data.quantity_remaining) || 0));
      if (rem <= 0) continue;
      const take = Math.min(rem, remainingToSell);
      tx.update(doc.ref, { quantity_remaining: rem - take });
      lines.push({
        batch_id: data.batch_id,
        quantity: take,
        retail_price: data.retail_price,
        sale_price: data.sale_price,
      });
      remainingToSell -= take;
    }

    const total_remaining = available - quantity;
    tx.update(itemRef, {
      total_items: total_remaining,
      current_retail_price: newest?.retail_price ?? 0,
      current_sale_price: newest?.sale_price ?? null,
    });

    return {
      sold: quantity,
      batches: lines,
      remaining_total: total_remaining,
    };
  });
}
