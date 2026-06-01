import { getDb } from "../firestoreAdmin";

export type StoreRecord = {
  uuid: string;
  owner_id: string;
  name: string;
  name_lower?: string;
  owner_name_lower?: string;
  owner_email_lower?: string;
  search_trigrams?: string[];
  address: string;
  description: string;
  status: "active" | "inactive";
  subscription_status: "free" | "subscribed";
  created_at: string;
  updated_at: string;
};

export async function createStore(input: {
  owner_id: string;
  name: string;
  name_lower: string;
  owner_name_lower: string;
  owner_email_lower: string;
  search_trigrams: string[];
  address: string;
  description: string;
  status: "active" | "inactive";
  subscription_status: "free" | "subscribed";
}): Promise<StoreRecord> {
  const db = getDb();
  const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const now = new Date().toISOString();

  const record: StoreRecord = {
    uuid,
    owner_id: String(input.owner_id),
    name: String(input.name).trim(),
    name_lower: String(input.name_lower),
    owner_name_lower: String(input.owner_name_lower),
    owner_email_lower: String(input.owner_email_lower),
    search_trigrams: Array.isArray(input.search_trigrams) ? input.search_trigrams : [],
    address: String(input.address).trim(),
    description: String(input.description).trim(),
    status: input.status,
    subscription_status: input.subscription_status,
    created_at: now,
    updated_at: now,
  };

  await db.collection("stores").doc(uuid).set(record);
  return record;
}

export async function getStoreByUuid(store_uuid: string): Promise<StoreRecord | null> {
  const db = getDb();
  const snap = await db.collection("stores").doc(String(store_uuid)).get();
  if (!snap.exists) return null;
  return snap.data() as StoreRecord;
}

export async function listStoresByOwner(opts: {
  owner_id: string;
  limit: number;
  cursor?: { created_at: string; uuid: string } | null;
}): Promise<{ stores: StoreRecord[]; next_cursor: { created_at: string; uuid: string } | null }> {
  const db = getDb();

  let q = db
    .collection("stores")
    .where("owner_id", "==", String(opts.owner_id))
    .orderBy("created_at", "desc")
    .orderBy("uuid", "desc")
    .limit(opts.limit);

  if (opts.cursor?.created_at && opts.cursor.uuid) {
    q = q.startAfter(opts.cursor.created_at, opts.cursor.uuid);
  }

  const snap = await q.get();
  const stores = snap.docs.map((d) => d.data() as StoreRecord);

  const last = stores[stores.length - 1];
  const next_cursor = last?.created_at && last.uuid ? { created_at: String(last.created_at), uuid: String(last.uuid) } : null;

  return { stores, next_cursor };
}

export async function listStoresAll(opts: {
  limit: number;
  cursor?: { created_at: string; uuid: string } | null;
}): Promise<{ stores: StoreRecord[]; next_cursor: { created_at: string; uuid: string } | null }> {
  const db = getDb();

  let q = db.collection("stores").orderBy("created_at", "desc").orderBy("uuid", "desc").limit(opts.limit);

  if (opts.cursor?.created_at && opts.cursor.uuid) {
    q = q.startAfter(opts.cursor.created_at, opts.cursor.uuid);
  }

  const snap = await q.get();
  const stores = snap.docs.map((d) => d.data() as StoreRecord);

  const last = stores[stores.length - 1];
  const next_cursor = last?.created_at && last.uuid ? { created_at: String(last.created_at), uuid: String(last.uuid) } : null;

  return { stores, next_cursor };
}

export async function searchStoresByTrigrams(opts: {
  trigrams: string[];
  limit: number;
  owner_id?: string;
}): Promise<StoreRecord[]> {
  const db = getDb();
  const tokens = opts.trigrams.filter((t) => typeof t === "string" && t.length > 0).slice(0, 10);
  if (!tokens.length) return [];

  let q: FirebaseFirestore.Query = db.collection("stores").where("search_trigrams", "array-contains-any", tokens);
  if (opts.owner_id) {
    q = q.where("owner_id", "==", String(opts.owner_id));
  }

  const snap = await q.limit(opts.limit).get();
  return snap.docs.map((d) => d.data() as StoreRecord);
}

