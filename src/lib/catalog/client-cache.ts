import type { CatalogBook } from "@/lib/types";

const memory = new Map<string, { expires: number; results: CatalogBook[] }>();
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const STORAGE_KEY = "ev-kutuphanesi.catalog-cache.v2";

type StoredCache = Record<string, { expires: number; results: CatalogBook[] }>;

function keyFor(query: string) {
  return query.trim().toLocaleLowerCase("tr");
}

function readStorage(): StoredCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCache) : {};
  } catch {
    return {};
  }
}

export function getClientCatalogCache(query: string): CatalogBook[] | null {
  const key = keyFor(query);
  const hit = memory.get(key);
  if (hit) {
    if (hit.expires >= Date.now()) return hit.results;
    memory.delete(key);
  }

  const stored = readStorage()[key];
  if (!stored) return null;
  if (stored.expires < Date.now()) return null;

  memory.set(key, stored);
  return stored.results;
}

export function setClientCatalogCache(query: string, results: CatalogBook[]) {
  const key = keyFor(query);
  const entry = { expires: Date.now() + TTL_MS, results };
  memory.set(key, entry);

  if (typeof window === "undefined") return;
  try {
    const stored = readStorage();
    stored[key] = entry;
    const keys = Object.keys(stored);
    if (keys.length > 100) {
      for (const oldKey of keys.slice(0, keys.length - 100)) {
        delete stored[oldKey];
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // localStorage can be full or disabled; memory cache still works.
  }
}
