/**
 * staticCache — localStorage-backed cache for data that rarely changes.
 * Use for: NRC constants, breed info, dietary categories, baselines, etc.
 *
 * Layered TTL strategy:
 *  - Memory (instant) — process-lifetime
 *  - localStorage (persistent) — survives page reloads
 *  - Network fallback — only when both miss or expire
 */

const PREFIX = "petid:cache:";
const memory = new Map<string, { value: unknown; expiresAt: number }>();

export interface CacheOptions {
  /** Time to live in ms. Default: 1 hour. */
  ttlMs?: number;
  /** Cache version — bump to invalidate all entries with this key. */
  version?: string;
}

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

function storageKey(key: string, version?: string): string {
  return `${PREFIX}${version ?? "v1"}:${key}`;
}

/**
 * Get a cached value if fresh; otherwise call loader, cache it, return it.
 */
export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: CacheOptions = {}
): Promise<T> {
  const ttl = opts.ttlMs ?? DEFAULT_TTL;
  const now = Date.now();
  const fullKey = storageKey(key, opts.version);

  // 1. Memory hit
  const mem = memory.get(fullKey);
  if (mem && mem.expiresAt > now) {
    return mem.value as T;
  }

  // 2. localStorage hit
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { value: T; expiresAt: number };
      if (parsed.expiresAt > now) {
        memory.set(fullKey, parsed);
        return parsed.value;
      }
      localStorage.removeItem(fullKey);
    }
  } catch {
    // ignore corrupt entries
  }

  // 3. Network fallback
  const value = await loader();
  const entry = { value, expiresAt: now + ttl };
  memory.set(fullKey, entry);
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // quota exceeded — best effort, memory cache still active
  }
  return value;
}

/** Manually invalidate a cached key. */
export function invalidate(key: string, version?: string): void {
  const fullKey = storageKey(key, version);
  memory.delete(fullKey);
  try {
    localStorage.removeItem(fullKey);
  } catch {
    // ignore
  }
}

/** Clear all PetID cache entries (e.g. on logout). */
export function clearAll(): void {
  memory.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Recommended TTLs for common data types. */
export const TTL = {
  /** Almost-static reference data (breeds, NRC constants) — 24h */
  REFERENCE: 24 * 60 * 60 * 1000,
  /** Per-pet baselines, settings — 1h */
  BASELINE: 60 * 60 * 1000,
  /** Product catalogs, prices — 15min */
  CATALOG: 15 * 60 * 1000,
  /** Volatile data (feeds, notifications) — 1min */
  VOLATILE: 60 * 1000,
} as const;