import { isbn10To13, normalizeIsbn } from "@/lib/isbn";
import type { CatalogBook } from "@/lib/types";

type GoogleVolume = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

function pickIsbns(identifiers: { type: string; identifier: string }[] | undefined) {
  let isbn: string | null = null;
  let isbn13: string | null = null;

  for (const item of identifiers ?? []) {
    const value = normalizeIsbn(item.identifier);
    if (!value) continue;
    if (item.type === "ISBN_13" || value.length === 13) isbn13 = value;
    if (item.type === "ISBN_10" || value.length === 10) isbn = value;
  }

  if (!isbn13 && isbn) isbn13 = isbn10To13(isbn);
  return { isbn, isbn13 };
}

function upgradeCover(url?: string) {
  if (!url) return null;
  return url.replace("http://", "https://").replace("&edge=curl", "");
}

export async function searchGoogleBooks(query: string): Promise<CatalogBook[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("printType", "books");

  const response = await fetch(url.toString(), {
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as { items?: GoogleVolume[] };

  return (data.items ?? [])
    .map((item) => item.volumeInfo)
    .filter((info): info is NonNullable<GoogleVolume["volumeInfo"]> =>
      Boolean(info?.title),
    )
    .map((info) => {
      const { isbn, isbn13 } = pickIsbns(info.industryIdentifiers);
      return {
        title: info.title!.trim(),
        authors: info.authors ?? [],
        isbn,
        isbn13,
        cover_url: upgradeCover(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail),
        publisher: info.publisher ?? null,
        published_date: info.publishedDate ?? null,
        page_count: info.pageCount ?? null,
        description: info.description ?? null,
        source: "google_books" as const,
      };
    });
}
