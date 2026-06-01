import { AppError } from "../../errors/AppError";
import { listStoresByOwner, listStoresAll, searchStoresByTrigrams } from "../../database/repos/storesNew.repo";
import { normalizeSpaces, pickQueryTrigrams } from "../admin/users/searchTokens";

export type ListStoresInput = {
  actor: { uuid: string; role?: string };
  search?: string;
  limit: number;
  cursor?: string;
};

function encodeCursor(c: { created_at: string; uuid: string }): string {
  return Buffer.from(`${c.created_at}|${c.uuid}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { created_at: string; uuid: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [created_at, uuid] = raw.split("|");
    if (!created_at || !uuid) return null;
    return { created_at, uuid };
  } catch {
    return null;
  }
}

export async function listStoresService(input: ListStoresInput) {
  const actorRole = String(input.actor.role || "").toLowerCase();
  const search = normalizeSpaces(String(input.search || ""));
  const owner_id = String(input.actor.uuid);

  // Search mode: fuzzy-ish via trigrams
  if (search) {
    const trigrams = pickQueryTrigrams(search);
    const stores = await searchStoresByTrigrams({
      trigrams,
      limit: Math.min(50, input.limit),
      owner_id: actorRole === "admin" ? undefined : owner_id,
    });
    return { stores, next_cursor: null };
  }

  const cursor = decodeCursor(String(input.cursor || ""));
  const res =
    actorRole === "admin"
      ? await listStoresAll({ limit: input.limit, cursor })
      : await listStoresByOwner({ owner_id, limit: input.limit, cursor });

  return {
    stores: res.stores,
    next_cursor: res.next_cursor ? encodeCursor(res.next_cursor) : null,
  };
}

