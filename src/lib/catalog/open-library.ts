import { fetchJson } from "@/lib/catalog/fetch-json";
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

type OpenLibraryBooksPayload = Record<
  string,
  {
    title?: string;
    authors?: { name?: string }[];
    publishers?: { name?: string }[];
    publish_date?: string;
    number_of_pages?: number;
    cover?: { large?: string; medium?: string; small?: string };
    notes?: string;
    excerpts?: { text?: string }[];
    identifiers?: { isbn_10?: string[]; isbn_13?: string[] };
  }
>;

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

  const data = await fetchJson<{ docs?: OpenLibraryDoc[] }>(url.toString(), {
    timeoutMs: 10000,
    revalidate: false,
  });

  if (!data) return [];

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

async function lookupOpenLibraryBooksApi(
  isbn: string,
): Promise<CatalogBook | null> {
  const url = new URL("https://openlibrary.org/api/books");
  url.searchParams.set("bibkeys", `ISBN:${isbn}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("jscmd", "data");

  const data = await fetchJson<OpenLibraryBooksPayload>(url.toString(), {
    timeoutMs: 10000,
    revalidate: false,
  });

  const entry = data?.[`ISBN:${isbn}`];
  if (!entry?.title) return null;

  const { isbn: isbn10, isbn13 } = pickIsbns([
    ...(entry.identifiers?.isbn_10 ?? []),
    ...(entry.identifiers?.isbn_13 ?? []),
    isbn,
  ]);

  return {
    title: entry.title.trim(),
    authors: (entry.authors ?? [])
      .map((author) => author.name?.trim())
      .filter((name): name is string => Boolean(name)),
    isbn: isbn10,
    isbn13,
    cover_url:
      entry.cover?.large ||
      entry.cover?.medium ||
      entry.cover?.small ||
      `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    publisher: entry.publishers?.[0]?.name ?? null,
    published_date: entry.publish_date ?? null,
    page_count: entry.number_of_pages ?? null,
    description: entry.notes || entry.excerpts?.[0]?.text || null,
    source: "open_library",
  };
}

export async function lookupOpenLibraryIsbn(
  isbn: string,
): Promise<CatalogBook | null> {
  const normalized = normalizeIsbn(isbn);
  if (!normalized) return null;

  const fromBooksApi = await lookupOpenLibraryBooksApi(normalized);
  if (fromBooksApi) return fromBooksApi;

  const data = await fetchJson<{
    title?: string;
    publishers?: string[];
    publish_date?: string;
    number_of_pages?: number;
    description?: string | { value?: string };
    covers?: number[];
    isbn_10?: string[];
    isbn_13?: string[];
    authors?: { key: string }[];
  }>(`https://openlibrary.org/isbn/${normalized}.json`, {
    timeoutMs: 10000,
    revalidate: false,
  });

  if (!data?.title) return null;

  const authors: string[] = [];
  for (const author of data.authors?.slice(0, 3) ?? []) {
    const authorData = await fetchJson<{ name?: string }>(
      `https://openlibrary.org${author.key}.json`,
      { timeoutMs: 6000, revalidate: 3600 },
    );
    if (authorData?.name) authors.push(authorData.name);
  }

  const { isbn: isbn10, isbn13 } = pickIsbns([
    ...(data.isbn_10 ?? []),
    ...(data.isbn_13 ?? []),
    normalized,
  ]);

  const description =
    typeof data.description === "string"
      ? data.description
      : (data.description?.value ?? null);

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
