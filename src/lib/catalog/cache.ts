import { preferredIsbn } from "@/lib/isbn";
import { supabase } from "@/lib/supabase/client";
import type { CatalogBook } from "@/lib/types";

const memory = new Map<string, { expires: number; results: CatalogBook[] }>();

const ISBN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const QUERY_TTL_MS = 1000 * 60 * 60 * 24; // 1 day

function stripFlags(books: CatalogBook[]): CatalogBook[] {
  return books.map((book) => ({
    title: book.title,
    authors: book.authors,
    isbn: book.isbn,
    isbn13: book.isbn13,
    cover_url: book.cover_url,
    publisher: book.publisher,
    published_date: book.published_date,
    page_count: book.page_count,
    description: book.description,
    source: book.source,
  }));
}

export function isbnCacheKey(isbn: string) {
  return `isbn:${isbn}`;
}

export function queryCacheKey(query: string) {
  return `q:${query.trim().toLocaleLowerCase("tr")}`;
}

export function getMemoryCache(key: string): CatalogBook[] | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.results;
}

export function setMemoryCache(
  key: string,
  results: CatalogBook[],
  ttlMs: number,
) {
  memory.set(key, {
    expires: Date.now() + ttlMs,
    results: stripFlags(results),
  });
}

export async function getDbCache(key: string): Promise<CatalogBook[] | null> {
  const { data, error } = await supabase
    .from("catalog_cache")
    .select("results, expires_at, hit_count")
    .eq("cache_key", key)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    void supabase.from("catalog_cache").delete().eq("cache_key", key);
    return null;
  }

  void supabase
    .from("catalog_cache")
    .update({ hit_count: (data.hit_count ?? 0) + 1 })
    .eq("cache_key", key);

  const results = (data.results ?? []) as CatalogBook[];
  setMemoryCache(key, results, ISBN_TTL_MS);
  return results;
}

export async function setDbCache(
  key: string,
  results: CatalogBook[],
  ttlMs: number,
) {
  if (!results.length) return;

  const payload = stripFlags(results);
  setMemoryCache(key, payload, ttlMs);

  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const { error } = await supabase.from("catalog_cache").upsert(
    {
      cache_key: key,
      results: payload,
      expires_at: expiresAt,
      hit_count: 0,
    },
    { onConflict: "cache_key" },
  );

  if (error) {
    console.error("catalog_cache upsert failed", error.message);
  }
}

export async function getCachedResults(key: string, isIsbn: boolean) {
  const memoryHit = getMemoryCache(key);
  if (memoryHit) {
    return { results: memoryHit, cache: "memory" as const };
  }

  const dbHit = await getDbCache(key);
  if (dbHit) {
    return { results: dbHit, cache: "db" as const };
  }

  return {
    results: null,
    cache: null,
    ttlMs: isIsbn ? ISBN_TTL_MS : QUERY_TTL_MS,
  };
}

export async function lookupLibraryAsCatalog(
  isbn: string,
): Promise<CatalogBook[]> {
  const { data, error } = await supabase
    .from("books")
    .select(
      "title,authors,isbn,isbn13,cover_url,publisher,published_date,page_count,description,source",
    )
    .or(`isbn.eq.${isbn},isbn13.eq.${isbn}`)
    .limit(5);

  if (error || !data?.length) return [];

  return data.map((book) => ({
    title: book.title,
    authors: book.authors ?? [],
    isbn: book.isbn,
    isbn13: book.isbn13,
    cover_url: book.cover_url,
    publisher: book.publisher,
    published_date: book.published_date,
    page_count: book.page_count,
    description: book.description,
    source:
      book.source === "open_library" || book.source === "google_books"
        ? book.source
        : "open_library",
    alreadyOwned: true,
  }));
}

export function cacheTtlForKey(key: string) {
  return key.startsWith("isbn:") ? ISBN_TTL_MS : QUERY_TTL_MS;
}

export function seedIsbnCaches(results: CatalogBook[]) {
  for (const book of results) {
    const isbn = preferredIsbn(book.isbn, book.isbn13);
    if (!isbn) continue;
    const key = isbnCacheKey(isbn);
    if (!getMemoryCache(key)) {
      setMemoryCache(key, [book], ISBN_TTL_MS);
      void setDbCache(key, [book], ISBN_TTL_MS);
    }
  }
}
