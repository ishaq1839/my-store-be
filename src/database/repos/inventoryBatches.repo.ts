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
