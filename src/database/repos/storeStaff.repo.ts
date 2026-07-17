import { getDb } from "../firestoreAdmin";

export type StoreMembershipRole = "owner" | "staff";

export type UserStoreRecord = {
  user_uuid: string;
  store_uuid: string;
  store_role: StoreMembershipRole;
  created_at: string;
  updated_at: string;
  firstname?: string;
  lastname?: string;
  email?: string;
};

function membershipDocId(user_uuid: string, store_uuid: string): string {
  return `${String(user_uuid)}_${String(store_uuid)}`;
}

export async function assignStoreToUser(input: {
  user_uuid: string;
  store_uuid: string;
  store_role?: StoreMembershipRole;
  email?: string;
  firstname?: string;
  lastname?: string;
}): Promise<UserStoreRecord> {
  const db = getDb();
  const user_uuid = String(input.user_uuid);
  const store_uuid = String(input.store_uuid);
  const store_role: StoreMembershipRole = input.store_role ?? "owner";
  const now = new Date().toISOString();
  const id = membershipDocId(user_uuid, store_uuid);

  const existing = await db.collection("user_stores").doc(id).get();
  const created_at =
    existing.exists && typeof existing.data()?.created_at === "string"
      ? String(existing.data()?.created_at)
      : now;

  const record: UserStoreRecord = {
    user_uuid,
    store_uuid,
    store_role,
    created_at,
    updated_at: now,
    ...(input.email ? { email: String(input.email).trim().toLowerCase() } : {}),
    ...(input.firstname ? { firstname: String(input.firstname).trim() } : {}),
    ...(input.lastname ? { lastname: String(input.lastname).trim() } : {}),
  };

  await db.collection("user_stores").doc(id).set(record, { merge: true });
  return record;
}

export async function getUserStoreMembership(
  user_uuid: string,
  store_uuid: string,
): Promise<UserStoreRecord | null> {
  const snap = await getDb().collection("user_stores").doc(membershipDocId(user_uuid, store_uuid)).get();
  if (!snap.exists) return null;
  const data = snap.data() as Partial<UserStoreRecord>;
  if (!data.user_uuid || !data.store_uuid) return null;
  return {
    user_uuid: String(data.user_uuid),
    store_uuid: String(data.store_uuid),
    store_role: (data.store_role === "staff" ? "staff" : "owner") as StoreMembershipRole,
    created_at: String(data.created_at || ""),
    updated_at: String(data.updated_at || ""),
    email: data.email ? String(data.email) : undefined,
    firstname: data.firstname ? String(data.firstname) : undefined,
    lastname: data.lastname ? String(data.lastname) : undefined,
  };
}

export async function listStaffMembershipsForStore(store_uuid: string): Promise<UserStoreRecord[]> {
  const snap = await getDb()
    .collection("user_stores")
    .where("store_uuid", "==", String(store_uuid))
    .where("store_role", "==", "staff")
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as Partial<UserStoreRecord>;
    return {
      user_uuid: String(data.user_uuid || ""),
      store_uuid: String(data.store_uuid || store_uuid),
      store_role: "staff" as const,
      created_at: String(data.created_at || ""),
      updated_at: String(data.updated_at || ""),
      email: data.email ? String(data.email) : undefined,
      firstname: data.firstname ? String(data.firstname) : undefined,
      lastname: data.lastname ? String(data.lastname) : undefined,
    };
  });
}

export async function removeStaffFromStore(input: {
  store_uuid: string;
  user_uuid: string;
}): Promise<boolean> {
  const membership = await getUserStoreMembership(input.user_uuid, input.store_uuid);
  if (!membership || membership.store_role !== "staff") return false;
  await getDb().collection("user_stores").doc(membershipDocId(input.user_uuid, input.store_uuid)).delete();
  return true;
}
