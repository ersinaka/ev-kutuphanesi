import { isbn10To13, normalizeIsbn } from "@/lib/isbn";
import type { CatalogBook } from "@/lib/types";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  isbn?: string[];
  publisher?: string[];
  publish_date?: string[];
  number_of_pages_median?: number;
  cover_i?: number;
  first_sentence?: string[] | string;
};

function pickIsbns(isbns: string[] | undefined) {
  let isbn: string | null = null;
  let isbn13: string | null = null;

  for (const raw of isbns ?? []) {
    const value = normalizeIsbn(raw);
    if (!value) continue;
    if (value.length === 13 && !isbn13) isbn13 = value;
    if (value.length === 10 && !isbn) isbn = value;
  }

  if (!isbn13 && isbn) isbn13 = isbn10To13(isbn);
  return { isbn, isbn13 };
}

function coverFromId(coverId?: number) {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

export async function searchOpenLibrary(query: string): Promise<CatalogBook[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set(
    "fields",
    "key,title,author_name,isbn,publisher,publish_date,number_of_pages_median,cover_i,first_sentence",
  );

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };

  return (data.docs ?? [])
    .filter((doc) => Boolean(doc.title))
    .map((doc) => {
      const { isbn, isbn13 } = pickIsbns(doc.isbn);
      const sentence = Array.isArray(doc.first_sentence)
        ? doc.first_sentence[0]
        : doc.first_sentence;

      return {
        title: doc.title!.trim(),
        authors: doc.author_name ?? [],
        isbn,
        isbn13,
        cover_url: coverFromId(doc.cover_i),
        publisher: doc.publisher?.[0] ?? null,
        published_date: doc.publish_date?.[0] ?? null,
        page_count: doc.number_of_pages_median ?? null,
        description: sentence ?? null,
        source: "open_library" as const,
      };
    });
}

export async function lookupOpenLibraryIsbn(isbn: string): Promise<CatalogBook | null> {
  const normalized = normalizeIsbn(isbn);
  if (!normalized) return null;

  const response = await fetch(
    `https://openlibrary.org/isbn/${normalized}.json`,
    { next: { revalidate: 0 } },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    title?: string;
    publishers?: string[];
    publish_date?: string;
    number_of_pages?: number;
    description?: string | { value?: string };
    covers?: number[];
    isbn_10?: string[];
    isbn_13?: string[];
    authors?: { key: string }[];
  };

  if (!data.title) return null;

  const authors: string[] = [];
  for (const author of data.authors?.slice(0, 3) ?? []) {
    try {
      const authorRes = await fetch(`https://openlibrary.org${author.key}.json`, {
        next: { revalidate: 3600 },
      });
      if (authorRes.ok) {
        const authorData = (await authorRes.json()) as { name?: string };
        if (authorData.name) authors.push(authorData.name);
      }
    } catch {
      // author lookup is best effort
    }
  }

  const { isbn: isbn10, isbn13 } = pickIsbns([
    ...(data.isbn_10 ?? []),
    ...(data.isbn_13 ?? []),
    normalized,
  ]);

  const description =
    typeof data.description === "string"
      ? data.description
      : data.description?.value ?? null;

  return {
    title: data.title.trim(),
    authors,
    isbn: isbn10,
    isbn13,
    cover_url: data.covers?.[0]
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
      : `https://covers.openlibrary.org/b/isbn/${normalized}-L.jpg`,
    publisher: data.publishers?.[0] ?? null,
    published_date: data.publish_date ?? null,
    page_count: data.number_of_pages ?? null,
    description,
    source: "open_library",
  };
}
