import type { CatalogBook } from "@/lib/types";

const memory = new Map<string, { expires: number; results: CatalogBook[] }>();
const TTL_MS = 1000 * 60 * 30;

export function getClientCatalogCache(query: string): CatalogBook[] | null {
  const key = query.trim().toLocaleLowerCase("tr");
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.results;
}

export function setClientCatalogCache(query: string, results: CatalogBook[]) {
  const key = query.trim().toLocaleLowerCase("tr");
  memory.set(key, { expires: Date.now() + TTL_MS, results });
}
