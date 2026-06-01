import { getDb } from "../firestoreAdmin";
import { buildTrigrams } from "../../services/admin/users/searchTokens";

export type InventoryItemRecord = {
  uuid: string;
  store_uuid: string;
  type?: "single" | "carton";
  name: string;
  description: string;
  short_code: string;
  name_lower: string;
  short_code_lower: string;
  search_trigrams: string[];
  created_at: string;
  created_by: string;
  total_items: number;
  current_retail_price: number;
  current_sale_price: number | null;
};

function itemsCol(store_uuid: string) {
  return getDb().collection("stores").doc(String(store_uuid)).collection("items");
}

function randomShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function shortCodeExistsInStore(store_uuid: string, short_code: string): Promise<boolean> {
  const snap = await itemsCol(store_uuid).where("short_code", "==", String(short_code)).limit(1).get();
  return !snap.empty;
}

export async function generateUniqueShortCode(store_uuid: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomShortCode();
    if (!(await shortCodeExistsInStore(store_uuid, code))) return code;
  }
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().slice(0, 8).toUpperCase() : `${Date.now()}`.slice(-8);
}

export async function createInventoryItem(input: {
  store_uuid: string;
  type: "single" | "carton";
  name: string;
  description: string;
  created_by: string;
  retail_price: number;
  sale_price: number | null;
  batch_quantity: number;
}): Promise<{ item: InventoryItemRecord; batch_id: string }> {
  const db = getDb();
  const itemId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const batchId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-b-${Math.random()}`;
  const now = new Date().toISOString();
  const short_code = await generateUniqueShortCode(input.store_uuid);
  const name_lower = String(input.name).trim().toLowerCase();
  const search_trigrams = buildTrigrams(`${name_lower} ${short_code.toLowerCase()}`);

  const item: InventoryItemRecord = {
    uuid: itemId,
    store_uuid: String(input.store_uuid),
    type: input.type,
    name: String(input.name).trim(),
    description: String(input.description).trim(),
    short_code,
    name_lower,
    short_code_lower: short_code.toLowerCase(),
    search_trigrams,
    created_at: now,
    created_by: String(input.created_by),
    total_items: input.batch_quantity,
    current_retail_price: input.retail_price,
    current_sale_price: input.sale_price,
  };

  const batch = {
    batch_id: batchId,
    created_at: now,
    created_by: String(input.created_by),
    retail_price: input.retail_price,
    sale_price: input.sale_price,
    quantity_total: input.batch_quantity,
    quantity_remaining: input.batch_quantity,
  };

  const storeRef = db.collection("stores").doc(String(input.store_uuid));
  const itemRef = storeRef.collection("items").doc(itemId);
  const batchRef = itemRef.collection("batches").doc(batchId);

  await db.runTransaction(async (tx) => {
    tx.set(itemRef, item);
    tx.set(batchRef, batch);
  });

  return { item, batch_id: batchId };
}

export async function getInventoryItem(store_uuid: string, item_id: string): Promise<InventoryItemRecord | null> {
  const snap = await itemsCol(store_uuid).doc(String(item_id)).get();
  if (!snap.exists) return null;
  return snap.data() as InventoryItemRecord;
}

export async function updateItemAfterBatchAdd(input: {
  store_uuid: string;
  item_id: string;
  new_total_items: number;
  current_retail_price: number;
  current_sale_price: number | null;
}): Promise<void> {
  await itemsCol(input.store_uuid).doc(String(input.item_id)).update({
    total_items: input.new_total_items,
    current_retail_price: input.current_retail_price,
    current_sale_price: input.current_sale_price,
  });
}

export async function setItemTotals(
  store_uuid: string,
  item_id: string,
  total_items: number,
  current_retail_price: number,
  current_sale_price: number | null
): Promise<void> {
  await itemsCol(store_uuid).doc(String(item_id)).update({
    total_items,
    current_retail_price,
    current_sale_price,
  });
}

export async function listInventoryItems(opts: {
  store_uuid: string;
  limit: number;
  cursor?: { created_at: string; uuid: string } | null;
}): Promise<{ items: InventoryItemRecord[]; next_cursor: { created_at: string; uuid: string } | null }> {
  let q = itemsCol(opts.store_uuid).orderBy("created_at", "desc").orderBy("uuid", "desc").limit(opts.limit);

  if (opts.cursor?.created_at && opts.cursor.uuid) {
    q = q.startAfter(opts.cursor.created_at, opts.cursor.uuid);
  }

  const snap = await q.get();
  const items = snap.docs.map((d) => d.data() as InventoryItemRecord);
  const last = items[items.length - 1];
  const next_cursor = last?.created_at && last.uuid ? { created_at: String(last.created_at), uuid: String(last.uuid) } : null;
  return { items, next_cursor };
}

export async function searchInventoryItemsByTrigrams(opts: {
  store_uuid: string;
  trigrams: string[];
  limit: number;
}): Promise<InventoryItemRecord[]> {
  const tokens = opts.trigrams.filter((t) => typeof t === "string" && t.length > 0).slice(0, 10);
  if (!tokens.length) return [];

  const snap = await itemsCol(opts.store_uuid).where("search_trigrams", "array-contains-any", tokens).limit(opts.limit * 3).get();
  return snap.docs.map((d) => d.data() as InventoryItemRecord);
}

/** Prefix match on name_lower or short_code_lower (when query too short for trigrams). */
export async function searchInventoryItemsByPrefix(opts: {
  store_uuid: string;
  prefix: string;
  limit: number;
}): Promise<InventoryItemRecord[]> {
  const p = String(opts.prefix).toLowerCase().trim();
  if (!p) return [];
  const end = `${p}\uf8ff`;
  const col = itemsCol(opts.store_uuid);
  const [nameSnap, codeSnap] = await Promise.all([
    col.orderBy("name_lower").startAt(p).endAt(end).limit(opts.limit).get(),
    col.orderBy("short_code_lower").startAt(p).endAt(end).limit(opts.limit).get(),
  ]);
  const byId = new Map<string, InventoryItemRecord>();
  for (const d of nameSnap.docs) byId.set(d.id, d.data() as InventoryItemRecord);
  for (const d of codeSnap.docs) byId.set(d.id, d.data() as InventoryItemRecord);
  return Array.from(byId.values());
}
