import { preferredIsbn } from "@/lib/isbn";
import type { CatalogBook } from "@/lib/types";

function keyFor(book: CatalogBook) {
  const isbn = preferredIsbn(book.isbn, book.isbn13);
  if (isbn) return `isbn:${isbn}`;
  return `title:${book.title.toLocaleLowerCase("tr")}|${book.authors.join(",").toLocaleLowerCase("tr")}`;
}

export function mergeCatalogResults(groups: CatalogBook[][]): CatalogBook[] {
  const map = new Map<string, CatalogBook>();

  for (const group of groups) {
    for (const book of group) {
      const key = keyFor(book);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, book);
        continue;
      }

      map.set(key, {
        title: existing.title || book.title,
        authors: existing.authors.length ? existing.authors : book.authors,
        isbn: existing.isbn || book.isbn,
        isbn13: existing.isbn13 || book.isbn13,
        cover_url: existing.cover_url || book.cover_url,
        publisher: existing.publisher || book.publisher,
        published_date: existing.published_date || book.published_date,
        page_count: existing.page_count || book.page_count,
        description: existing.description || book.description,
        source: existing.source,
      });
    }
  }

  return Array.from(map.values());
}
