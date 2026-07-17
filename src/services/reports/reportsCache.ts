export type ReportCacheSource = "cache" | "db";

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500;

type CacheEntry = {
  data: unknown;
  expiresAt: number;
  touchedAt: number;
};

const reportCache = new Map<string, CacheEntry>();

function pruneExpired(now: number): void {
  for (const [key, entry] of reportCache) {
    if (entry.expiresAt <= now) reportCache.delete(key);
  }
}

function touchAndEvict(key: string, entry: CacheEntry, now: number): void {
  entry.touchedAt = now;
  reportCache.set(key, entry);

  if (reportCache.size <= MAX_ENTRIES) return;

  let oldestKey: string | null = null;
  let oldestTouched = Number.POSITIVE_INFINITY;
  for (const [k, v] of reportCache) {
    if (k === key) continue;
    if (v.touchedAt < oldestTouched) {
      oldestTouched = v.touchedAt;
      oldestKey = k;
    }
  }
  if (oldestKey) reportCache.delete(oldestKey);
}

/**
 * Serve a report payload from memory when warm (30m TTL).
 * Pass forceRefresh=true (query `refresh=true`) to reload from Firestore and replace the cache entry.
 */
export async function withReportCache<T extends object>(opts: {
  key: string;
  forceRefresh?: boolean;
  loader: () => Promise<T>;
}): Promise<T & { source: ReportCacheSource }> {
  const now = Date.now();
  pruneExpired(now);

  if (!opts.forceRefresh) {
    const hit = reportCache.get(opts.key);
    if (hit && hit.expiresAt > now) {
      touchAndEvict(opts.key, hit, now);
      return { ...(hit.data as T), source: "cache" };
    }
  }

  const data = await opts.loader();
  const entry: CacheEntry = {
    data,
    expiresAt: now + TTL_MS,
    touchedAt: now,
  };
  touchAndEvict(opts.key, entry, now);
  return { ...data, source: "db" };
}

export function reportCacheKey(parts: Array<string | number | boolean | null | undefined>): string {
  return parts.map((p) => String(p ?? "")).join("|");
}
