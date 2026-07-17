import {
  listAllInventoryItems,
  type InventoryItemRecord,
} from "../../database/repos/inventoryItems.repo";
import {
  invalidatePreviewItemCache,
  invalidatePreviewStoreCache,
} from "../bills/previewDataCache";

const TTL_MS = 30 * 60 * 1000;
const MAX_STORES = 50;

type StoreCacheEntry = {
  itemsById: Map<string, InventoryItemRecord>;
  expiresAt: number;
  touchedAt: number;
};

const storeCache = new Map<string, StoreCacheEntry>();

function isWarm(entry: StoreCacheEntry | undefined, now: number): entry is StoreCacheEntry {
  return Boolean(entry && entry.expiresAt > now);
}

function touchAndEvict(store_uuid: string, entry: StoreCacheEntry, now: number): void {
  entry.touchedAt = now;
  storeCache.set(store_uuid, entry);

  if (storeCache.size <= MAX_STORES) return;

  let oldestKey: string | null = null;
  let oldestTouched = Number.POSITIVE_INFINITY;
  for (const [key, value] of storeCache) {
    if (key === store_uuid) continue;
    if (value.touchedAt < oldestTouched) {
      oldestTouched = value.touchedAt;
      oldestKey = key;
    }
  }
  if (oldestKey) storeCache.delete(oldestKey);
}

export type InventoryCacheSource = "cache" | "db";

export async function getStoreItems(
  store_uuid: string,
): Promise<{ items: InventoryItemRecord[]; source: InventoryCacheSource }> {
  const key = String(store_uuid);
  const now = Date.now();
  const hit = storeCache.get(key);
  if (isWarm(hit, now)) {
    touchAndEvict(key, hit, now);
    return { items: Array.from(hit.itemsById.values()), source: "cache" };
  }

  const items = await listAllInventoryItems(key);
  const itemsById = new Map<string, InventoryItemRecord>();
  for (const item of items) itemsById.set(item.uuid, item);

  const entry: StoreCacheEntry = {
    itemsById,
    expiresAt: now + TTL_MS,
    touchedAt: now,
  };
  touchAndEvict(key, entry, now);
  return { items, source: "db" };
}

export function upsertStoreInventoryItem(store_uuid: string, item: InventoryItemRecord): void {
  const key = String(store_uuid);
  const now = Date.now();
  const hit = storeCache.get(key);
  if (!isWarm(hit, now)) {
    invalidatePreviewItemCache(key, item.uuid);
    return;
  }

  hit.itemsById.set(item.uuid, item);
  touchAndEvict(key, hit, now);
  invalidatePreviewItemCache(key, item.uuid);
}

export function invalidateStoreInventoryCache(store_uuid: string): void {
  const key = String(store_uuid);
  storeCache.delete(key);
  invalidatePreviewStoreCache(key);
}
