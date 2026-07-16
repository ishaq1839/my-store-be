import { getDb } from "../firestoreAdmin";

export type ContactRecord = {
  uuid: string;
  owner_uuid: string;
  store_uuid: string;
  name: string;
  description: string;
  address?: string;
  contact_number?: string;
  created_at: string;
  updated_at: string;
};

export async function createContact(input: {
  owner_uuid: string;
  store_uuid: string;
  name: string;
  description: string;
  address?: string;
  contact_number?: string;
}): Promise<ContactRecord> {
  const db = getDb();
  const uuid = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const now = new Date().toISOString();

  const record: ContactRecord = {
    uuid,
    owner_uuid: String(input.owner_uuid),
    store_uuid: String(input.store_uuid),
    name: String(input.name).trim(),
    description: String(input.description).trim(),
    address: input.address ? String(input.address).trim() : undefined,
    contact_number: input.contact_number ? String(input.contact_number).trim() : undefined,
    created_at: now,
    updated_at: now,
  };

  await db.collection("contacts").doc(uuid).set(record);
  return record;
}

export async function listContactsByStore(store_uuid: string): Promise<ContactRecord[]> {
  const db = getDb();
  const snap = await db
    .collection("contacts")
    .where("store_uuid", "==", String(store_uuid))
    .orderBy("created_at", "desc")
    .get();

  return snap.docs.map((d) => d.data() as ContactRecord);
}
