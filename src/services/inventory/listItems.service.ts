import { assertCanSellAtStore } from "./assertStoreInventoryAccess.service";
import { type InventoryItemRecord } from "../../database/repos/inventoryItems.repo";
import { isServiceItem } from "./inventoryItemTypes";
import { getStoreItems } from "./inventoryStoreCache";
import { normalizeSpaces, pickQueryTrigrams } from "../admin/users/searchTokens";

function itemIsVisible(it: InventoryItemRecord): boolean {
  return Number(it.total_items) > 0 || isServiceItem(it.type);
}

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

function compareCreatedDesc(a: InventoryItemRecord, b: InventoryItemRecord): number {
  const byCreated = String(b.created_at).localeCompare(String(a.created_at));
  if (byCreated !== 0) return byCreated;
  return String(b.uuid).localeCompare(String(a.uuid));
}

function isAfterCursor(
  item: InventoryItemRecord,
  cursor: { created_at: string; uuid: string },
): boolean {
  const byCreated = String(item.created_at).localeCompare(String(cursor.created_at));
  if (byCreated < 0) return true;
  if (byCreated > 0) return false;
  return String(item.uuid).localeCompare(String(cursor.uuid)) < 0;
}

export async function listInventoryItemsService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  search?: string;
  limit: number;
  cursor?: string;
}) {
  await assertCanSellAtStore(input.actor, input.store_uuid);

  const { items: all, source } = await getStoreItems(input.store_uuid);
  const search = normalizeSpaces(String(input.search || ""));

  if (search) {
    const trigrams = pickQueryTrigrams(search);
    const scored = all
      .map((it) => ({ it, score: scoreItemForQuery(it, search, trigrams) }))
      .filter((x) => x.score > 0 && itemIsVisible(x.it))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(b.it.created_at).localeCompare(String(a.it.created_at));
      });

    const page = scored.slice(0, input.limit).map((x) => x.it);
    return { items: page, next_cursor: null as string | null, source };
  }

  const cursor = decodeCursor(String(input.cursor || ""));
  const visible = all
    .filter(itemIsVisible)
    .sort(compareCreatedDesc)
    .filter((it) => (cursor ? isAfterCursor(it, cursor) : true));

  const page = visible.slice(0, input.limit);
  const last = page[page.length - 1];

  return {
    items: page,
    next_cursor:
      page.length === input.limit && last?.created_at && last.uuid
        ? encodeCursor({ created_at: String(last.created_at), uuid: String(last.uuid) })
        : null,
    source,
  };
}
