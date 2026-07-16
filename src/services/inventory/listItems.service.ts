import { assertCanManageStoreInventory } from "./assertStoreInventoryAccess.service";
import {
  listInventoryItems,
  searchInventoryItemsByTrigrams,
  searchInventoryItemsByPrefix,
  type InventoryItemRecord,
} from "../../database/repos/inventoryItems.repo";
import { normalizeSpaces, pickQueryTrigrams } from "../admin/users/searchTokens";

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

function scoreItemForQuery(item: InventoryItemRecord, query: string, queryTrigrams: string[]): number {
  const q = normalizeSpaces(query);
  const name = item.name_lower || "";
  const code = item.short_code_lower || "";

  let score = 0;
  if (Array.isArray(item.search_trigrams) && queryTrigrams.length) {
    const set = new Set(item.search_trigrams);
    for (const t of queryTrigrams) if (set.has(t)) score += 2;
  }
  if (q && name.includes(q)) score += 10;
  if (q && code.includes(q)) score += 10;
  if (q && name.startsWith(q)) score += 6;
  if (q && code.startsWith(q)) score += 6;
  return score;
}

export async function listInventoryItemsService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  search?: string;
  limit: number;
  cursor?: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const search = normalizeSpaces(String(input.search || ""));

  if (search) {
    const trigrams = pickQueryTrigrams(search);
    const candidates =
      trigrams.length > 0
        ? await searchInventoryItemsByTrigrams({
            store_uuid: input.store_uuid,
            trigrams,
            limit: 80,
          })
        : await searchInventoryItemsByPrefix({
            store_uuid: input.store_uuid,
            prefix: search.toLowerCase(),
            limit: 80,
          });
    const byId = new Map<string, InventoryItemRecord>();
    for (const it of candidates) byId.set(it.uuid, it);
    const scored = Array.from(byId.values())
      .map((it) => ({ it, score: scoreItemForQuery(it, search, trigrams) }))
      .filter((x) => x.score > 0 && Number(x.it.total_items) > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(b.it.created_at).localeCompare(String(a.it.created_at));
      });

    const page = scored.slice(0, input.limit).map((x) => x.it);
    return { items: page, next_cursor: null as string | null };
  }

  const cursor = decodeCursor(String(input.cursor || ""));
  const inStock: InventoryItemRecord[] = [];
  let nextCursor: { created_at: string; uuid: string } | null = cursor;
  let safety = 0;

  // Skip out-of-stock items while preserving pagination.
  while (inStock.length < input.limit && safety < 8) {
    safety += 1;
    const res = await listInventoryItems({
      store_uuid: input.store_uuid,
      limit: Math.max(input.limit * 2, 20),
      cursor: nextCursor,
    });

    for (const it of res.items) {
      if (Number(it.total_items) > 0) inStock.push(it);
      if (inStock.length >= input.limit) break;
    }

    nextCursor = res.next_cursor;
    if (!res.next_cursor || res.items.length === 0) break;
  }

  const page = inStock.slice(0, input.limit);
  const last = page[page.length - 1];

  return {
    items: page,
    next_cursor:
      page.length === input.limit && last?.created_at && last.uuid
        ? encodeCursor({ created_at: String(last.created_at), uuid: String(last.uuid) })
        : null,
  };
}
