import { getDb } from "../firestoreAdmin";

export type StoreRecord = {
  uuid: string;
  owner_id?: string;
  created_at: unknown;
  updated_at: unknown;
  name: string;
  description?: string;
  address?: string;
  status?: string;
  subscription_status?: string;
};

export type StoreDto = {
  uuid: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  address: string;
  status: string;
  subscription_status: string;
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
    owner_id: store.owner_id ? String(store.owner_id) : "",
    created_at: toIsoString(store.created_at),
    updated_at: toIsoString(store.updated_at),
    name: String(store.name),
    description: store.description ? String(store.description) : "",
    address: store.address ? String(store.address) : "",
    status: store.status ? String(store.status) : "active",
    subscription_status: store.subscription_status ? String(store.subscription_status) : "free",
  };
}

function pushStore(map: Map<string, StoreDto>, data: Partial<StoreRecord>) {
  if (!data.uuid || !data.name) return;
  map.set(
    String(data.uuid),
    toStoreDto({
      uuid: String(data.uuid),
      owner_id: data.owner_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      name: String(data.name),
      description: data.description,
      address: data.address,
      status: data.status,
      subscription_status: data.subscription_status,
    })
  );
}

export async function assignStoreToUser(input: { user_uuid: string; store_uuid: string }): Promise<void> {
  const db = getDb();
  const user_uuid = String(input.user_uuid);
  const store_uuid = String(input.store_uuid);
  const id = `${user_uuid}_${store_uuid}`;
  await db.collection("user_stores").doc(id).set(
    {
      user_uuid,
      store_uuid,
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getStoresForUserUuid(userUuid: string): Promise<StoreDto[]> {
  const db = getDb();
  const uid = String(userUuid);
  const map = new Map<string, StoreDto>();

  // Stores owned by the user.
  const ownedSnap = await db.collection("stores").where("owner_id", "==", uid).get();
  for (const doc of ownedSnap.docs) {
    pushStore(map, doc.data() as Partial<StoreRecord>);
  }

  // Stores explicitly assigned to the user.
  const mappingsSnap = await db.collection("user_stores").where("user_uuid", "==", uid).get();
  const storeUuids = mappingsSnap.docs
    .map((d) => d.data()?.store_uuid)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  for (let i = 0; i < storeUuids.length; i += 10) {
    const chunk = storeUuids.slice(i, i + 10);
    const storesSnap = await db.collection("stores").where("uuid", "in", chunk).get();
    for (const doc of storesSnap.docs) {
      pushStore(map, doc.data() as Partial<StoreRecord>);
    }
  }

  return Array.from(map.values());
}
