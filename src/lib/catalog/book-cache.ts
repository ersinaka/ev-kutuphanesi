import { preferredIsbn } from "@/lib/isbn";
import { createServerSupabase } from "@/lib/supabase/server";
import type { CatalogBook } from "@/lib/types";

const memory = new Map<string, CatalogBook>();
const VERSION = "v1";

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .replace(/[^a-z0-9çğıöşü]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleMetadataKey(title: string) {
  return `title:${VERSION}:${normalize(title)}`;
}

function keysFor(book: CatalogBook) {
  const keys: string[] = [];
  const isbn = preferredIsbn(book.isbn, book.isbn13);
  if (isbn) keys.push(`isbn:${isbn}`);
  keys.push(titleMetadataKey(book.title));
  return keys;
}

function stripFlags(book: CatalogBook): CatalogBook {
  return {
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
  };
}

export async function getBookMetadata(key: string): Promise<CatalogBook | null> {
  const local = memory.get(key);
  if (local) return local;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("book_metadata")
    .select("book")
    .eq("cache_key", key)
    .maybeSingle();

  if (error || !data?.book) return null;

  const book = data.book as CatalogBook;
  memory.set(key, book);
  return book;
}

export async function cacheBooks(books: CatalogBook[]) {
  if (!books.length) return;

  const supabase = await createServerSupabase();
  const rows = new Map<string, CatalogBook>();
  for (const book of books) {
    const payload = stripFlags(book);
    for (const key of keysFor(book)) {
      rows.set(key, payload);
    }
  }

  for (const [key, book] of rows) memory.set(key, book);

  const { error } = await supabase.from("book_metadata").upsert(
    Array.from(rows, ([cache_key, book]) => ({
      cache_key,
      book,
      source: book.source,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "cache_key" },
  );

  if (error) console.error("book_metadata upsert failed", error.message);
}
