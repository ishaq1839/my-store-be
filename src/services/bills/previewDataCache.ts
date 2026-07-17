import type { InventoryBatchRecord } from "../../database/repos/inventoryBatches.repo";
import type { InventoryItemRecord } from "../../database/repos/inventoryItems.repo";
import { getInventoryItemsByIds } from "../../database/repos/inventoryItems.repo";
import { listActiveBatchesAscForItems } from "../../database/repos/inventoryBatches.repo";

const TTL_MS = 30 * 60 * 1000;

type CacheEntry<T> = { data: T; expires: number };

const itemCache = new Map<string, CacheEntry<InventoryItemRecord>>();
const batchCache = new Map<string, CacheEntry<InventoryBatchRecord[]>>();

function cacheKey(store_uuid: string, item_id: string): string {
  return `${store_uuid}:${item_id}`;
}

function pruneExpired<T>(cache: Map<string, CacheEntry<T>>, now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expires <= now) cache.delete(key);
  }
}

export async function getPreviewItemsByIds(
  store_uuid: string,
  item_ids: string[],
): Promise<Map<string, InventoryItemRecord>> {
  const uniqueIds = [...new Set(item_ids.map((id) => String(id).trim()).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const now = Date.now();
  pruneExpired(itemCache, now);

  const result = new Map<string, InventoryItemRecord>();
  const missing: string[] = [];

  for (const item_id of uniqueIds) {
    const hit = itemCache.get(cacheKey(store_uuid, item_id));
    if (hit && hit.expires > now) result.set(item_id, hit.data);
    else missing.push(item_id);
  }

  if (missing.length) {
    const fetched = await getInventoryItemsByIds(store_uuid, missing);
    for (const [item_id, item] of fetched) {
      result.set(item_id, item);
      itemCache.set(cacheKey(store_uuid, item_id), { data: item, expires: now + TTL_MS });
    }
  }

  return result;
}

export async function getPreviewActiveBatchesForItems(
  store_uuid: string,
  item_ids: string[],
): Promise<Map<string, InventoryBatchRecord[]>> {
  const uniqueIds = [...new Set(item_ids.map((id) => String(id).trim()).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const now = Date.now();
  pruneExpired(batchCache, now);

  const result = new Map<string, InventoryBatchRecord[]>();
  const missing: string[] = [];

  for (const item_id of uniqueIds) {
    const hit = batchCache.get(cacheKey(store_uuid, item_id));
    if (hit && hit.expires > now) result.set(item_id, hit.data);
    else missing.push(item_id);
  }

  if (missing.length) {
    const fetched = await listActiveBatchesAscForItems(store_uuid, missing);
    for (const [item_id, batches] of fetched) {
      result.set(item_id, batches);
      batchCache.set(cacheKey(store_uuid, item_id), { data: batches, expires: now + TTL_MS });
    }
  }

  return result;
}

export function invalidatePreviewItemCache(store_uuid: string, item_id: string): void {
  const key = cacheKey(store_uuid, item_id);
  itemCache.delete(key);
  batchCache.delete(key);
}

export function invalidatePreviewStoreCache(store_uuid: string): void {
  const prefix = `${String(store_uuid)}:`;
  for (const key of itemCache.keys()) {
    if (key.startsWith(prefix)) itemCache.delete(key);
  }
  for (const key of batchCache.keys()) {
    if (key.startsWith(prefix)) batchCache.delete(key);
  }
}
