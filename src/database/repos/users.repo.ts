import { getDb } from "../firestoreAdmin";
import { AppError } from "../../errors/AppError";

export type UserRecord = {
  uuid: string;
  email: string;
  password_hash?: string;
  role?: string;
  firstname?: string;
  lastname?: string;
  auth_uid?: string;
  email_lower?: string;
  full_name_lower?: string;
  search_trigrams?: string[];
  created_at?: unknown;
  updated_at?: unknown;
};

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const db = getDb();
  const normalizedEmail = String(email).trim().toLowerCase();

  const snap = await db.collection("users").where("email", "==", normalizedEmail).limit(1).get();
  if (snap.empty) return null;

  const data = snap.docs[0].data() as Partial<UserRecord>;
  if (!data.uuid || !data.email) return null;

  return {
    uuid: String(data.uuid),
    email: String(data.email),
    password_hash: data.password_hash ? String(data.password_hash) : undefined,
    role: data.role ? String(data.role) : undefined,
    firstname: data.firstname ? String(data.firstname) : undefined,
    lastname: data.lastname ? String(data.lastname) : undefined,
    auth_uid: data.auth_uid ? String(data.auth_uid) : undefined,
    email_lower: data.email_lower ? String(data.email_lower) : undefined,
    full_name_lower: data.full_name_lower ? String(data.full_name_lower) : undefined,
    search_trigrams: Array.isArray(data.search_trigrams) ? (data.search_trigrams as string[]) : undefined,
  };
}

export async function getUserByUuid(uuid: string): Promise<UserRecord | null> {
  const db = getDb();
  const id = String(uuid).trim();
  if (!id) return null;

  const doc = await db.collection("users").doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data() as Partial<UserRecord> | undefined;
  if (!data?.uuid || !data.email) return null;

  return {
    uuid: String(data.uuid),
    email: String(data.email),
    password_hash: data.password_hash ? String(data.password_hash) : undefined,
    role: data.role ? String(data.role) : undefined,
    firstname: data.firstname ? String(data.firstname) : undefined,
    lastname: data.lastname ? String(data.lastname) : undefined,
    auth_uid: data.auth_uid ? String(data.auth_uid) : undefined,
    email_lower: data.email_lower ? String(data.email_lower) : undefined,
    full_name_lower: data.full_name_lower ? String(data.full_name_lower) : undefined,
    search_trigrams: Array.isArray(data.search_trigrams) ? (data.search_trigrams as string[]) : undefined,
  };
}

export type CreateUserInput = {
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  auth_uid: string;
  email_lower: string;
  full_name_lower: string;
  search_trigrams: string[];
};

export async function createUser(input: CreateUserInput): Promise<Pick<UserRecord, "uuid" | "email" | "role">> {
  const db = getDb();
  const normalizedEmail = String(input.email).trim().toLowerCase();

  const existing = await db.collection("users").where("email", "==", normalizedEmail).limit(1).get();
  if (!existing.empty) {
    throw new AppError("Email already exists", { statusCode: 409 });
  }

  // Use Firebase Auth uid as our primary user uuid.
  const uuid = String(input.auth_uid);
  const now = new Date().toISOString();

  await db.collection("users").doc(uuid).set({
    uuid,
    email: normalizedEmail,
    email_lower: String(input.email_lower),
    firstname: String(input.firstname).trim(),
    lastname: String(input.lastname).trim(),
    full_name_lower: String(input.full_name_lower),
    search_trigrams: Array.isArray(input.search_trigrams) ? input.search_trigrams : [],
    role: String(input.role || "user"),
    auth_uid: String(input.auth_uid),
    created_at: now,
    updated_at: now,
  });

  return { uuid, email: normalizedEmail, role: String(input.role || "user") };
}

export type PublicUser = {
  uuid: string;
  email: string;
  role: string;
  firstname: string;
  lastname: string;
  created_at?: unknown;
  updated_at?: unknown;
};

function toPublicUser(data: Partial<UserRecord>): PublicUser | null {
  if (!data.uuid || !data.email) return null;
  return {
    uuid: String(data.uuid),
    email: String(data.email),
    role: String(data.role || "user"),
    firstname: String(data.firstname || ""),
    lastname: String(data.lastname || ""),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function listUsersByCreatedAt(opts: {
  limit: number;
  cursor?: { created_at: string; uuid: string } | null;
}): Promise<{ users: PublicUser[]; next_cursor: { created_at: string; uuid: string } | null }> {
  const db = getDb();
  let q = db.collection("users").orderBy("created_at", "desc").orderBy("uuid", "desc").limit(opts.limit);

  if (opts.cursor?.created_at && opts.cursor.uuid) {
    q = q.startAfter(opts.cursor.created_at, opts.cursor.uuid);
  }

  const snap = await q.get();
  const users: PublicUser[] = [];
  for (const doc of snap.docs) {
    const u = toPublicUser(doc.data() as Partial<UserRecord>);
    if (u) users.push(u);
  }

  const last = snap.docs[snap.docs.length - 1]?.data() as Partial<UserRecord> | undefined;
  const next_cursor =
    last?.created_at && last.uuid
      ? { created_at: String(last.created_at), uuid: String(last.uuid) }
      : null;

  return { users, next_cursor };
}

export async function searchUsersByTrigrams(trigrams: string[], limit: number): Promise<UserRecord[]> {
  const db = getDb();
  const tokens = trigrams.filter((t) => typeof t === "string" && t.length > 0).slice(0, 10);
  if (!tokens.length) return [];

  const snap = await db.collection("users").where("search_trigrams", "array-contains-any", tokens).limit(limit).get();
  return snap.docs.map((d) => d.data() as UserRecord);
}

