import { getDb } from "../firestoreAdmin";

export type StoreRecord = {
  uuid: string;
  owner_id?: string;
  created_at: unknown;
  updated_at: unknown;
  name: string;
  description?: string;
};

export type StoreDto = {
  uuid: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
};

type FirestoreTimestampLike = { toDate: () => Date };

function toIsoString(v: unknown): string {
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
  }
  if (v && typeof v === "object" && "toDate" in v && typeof (v as FirestoreTimestampLike).toDate === "function") {
    return (v as FirestoreTimestampLike).toDate().toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  return new Date(0).toISOString();
}

function toStoreDto(store: StoreRecord): StoreDto {
  return {
    uuid: String(store.uuid),
    created_at: toIsoString(store.created_at),
    updated_at: toIsoString(store.updated_at),
    name: String(store.name),
    description: store.description ? String(store.description) : "",
  };
}

export async function getStoresForUserUuid(userUuid: string): Promise<StoreDto[]> {
  const db = getDb();

  // Primary source: stores owned by the user (new store feature).
  const ownedSnap = await db.collection("stores").where("owner_id", "==", String(userUuid)).get();
  const owned: StoreDto[] = [];
  for (const doc of ownedSnap.docs) {
    const data = doc.data() as Partial<StoreRecord>;
    if (!data.uuid || !data.name) continue;
    owned.push(
      toStoreDto({
        uuid: String(data.uuid),
        created_at: data.created_at,
        updated_at: data.updated_at,
        name: String(data.name),
        description: data.description,
      })
    );
  }

  const mappingsSnap = await db
    .collection("user_stores")
    .where("user_uuid", "==", String(userUuid))
    .get();

  // If no explicit assignments exist, return owned stores.
  if (mappingsSnap.empty) return owned;

  const storeUuids = mappingsSnap.docs
    .map((d) => d.data()?.store_uuid)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (!storeUuids.length) return owned;

  const chunks: string[][] = [];
  for (let i = 0; i < storeUuids.length; i += 10) chunks.push(storeUuids.slice(i, i + 10));

  const results: StoreDto[] = [];
  for (const chunk of chunks) {
    const storesSnap = await db.collection("stores").where("uuid", "in", chunk).get();
    for (const doc of storesSnap.docs) {
      const data = doc.data() as Partial<StoreRecord>;
      if (!data.uuid || !data.name) continue;
      results.push(
        toStoreDto({
          uuid: String(data.uuid),
          created_at: data.created_at,
          updated_at: data.updated_at,
          name: String(data.name),
          description: data.description,
        })
      );
    }
  }

  // Merge owned + mapped, de-duplicate by uuid.
  const map = new Map<string, StoreDto>();
  for (const s of owned) map.set(s.uuid, s);
  for (const s of results) map.set(s.uuid, s);
  return Array.from(map.values());
}

