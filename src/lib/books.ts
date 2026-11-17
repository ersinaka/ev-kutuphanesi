import { preferredIsbn } from "@/lib/isbn";
import { findSimilarBooks } from "@/lib/similarity";
import { supabase } from "@/lib/supabase/client";
import type {
  Book,
  BookInsert,
  BookUpdate,
  CatalogBook,
  LibraryStats,
  ReadingStatus,
} from "@/lib/types";

export async function listBooks(search?: string): Promise<Book[]> {
  let query = supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    const term = search.trim();
    query = query.or(
      `title.ilike.%${term}%,isbn.ilike.%${term}%,isbn13.ilike.%${term}%,notes.ilike.%${term}%,location.ilike.%${term}%,loaned_to.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Book[];
}

export async function getBook(id: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Book | null) ?? null;
}

export async function addBook(input: BookInsert): Promise<Book> {
  const payload: BookInsert = {
    ...input,
    title: input.title.trim(),
    authors: input.authors?.map((a) => a.trim()).filter(Boolean) ?? [],
    isbn: input.isbn || null,
    isbn13: input.isbn13 || null,
    source: input.source ?? "manual",
    reading_status: input.reading_status ?? "unread",
    loaned_to: input.loaned_to || null,
    loaned_at: input.loaned_at || null,
    due_at: input.due_at || null,
  };

  const { data, error } = await supabase
    .from("books")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as Book;
}

export async function updateBook(id: string, input: BookUpdate): Promise<Book> {
  const payload: BookUpdate = { ...input };

  if (typeof payload.title === "string") {
    payload.title = payload.title.trim();
  }
  if (payload.authors) {
    payload.authors = payload.authors.map((a) => a.trim()).filter(Boolean);
  }
  if ("isbn" in payload) payload.isbn = payload.isbn || null;
  if ("isbn13" in payload) payload.isbn13 = payload.isbn13 || null;
  if ("loaned_to" in payload) payload.loaned_to = payload.loaned_to || null;
  if ("loaned_at" in payload) payload.loaned_at = payload.loaned_at || null;
  if ("due_at" in payload) payload.due_at = payload.due_at || null;

  const { data, error } = await supabase
    .from("books")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Book;
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

export async function addBooksBulk(inputs: BookInsert[]) {
  const results: { ok: Book[]; failed: { input: BookInsert; error: string }[] } =
    { ok: [], failed: [] };

  for (const input of inputs) {
    try {
      const book = await addBook(input);
      results.ok.push(book);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Ekleme başarısız.";
      results.failed.push({ input, error: message });
    }
  }

  return results;
}

export async function findOwnedMatches(books: CatalogBook[]) {
  const isbns = books
    .flatMap((book) => [book.isbn, book.isbn13])
    .filter((value): value is string => Boolean(value));

  if (!isbns.length) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("books")
    .select("isbn,isbn13")
    .or(
      [
        ...isbns.map((isbn) => `isbn.eq.${isbn}`),
        ...isbns.map((isbn) => `isbn13.eq.${isbn}`),
      ].join(","),
    );

  if (error) throw error;

  const owned = new Set<string>();
  for (const row of data ?? []) {
    if (row.isbn) owned.add(row.isbn);
    if (row.isbn13) owned.add(row.isbn13);
  }
  return owned;
}

export function markOwned(books: CatalogBook[], ownedIsbns: Set<string>) {
  return books.map((book) => {
    const isbn = preferredIsbn(book.isbn, book.isbn13);
    return {
      ...book,
      alreadyOwned: isbn ? ownedIsbns.has(isbn) : false,
    };
  });
}

export function markPossibleDuplicates(
  books: CatalogBook[],
  library: Pick<Book, "title" | "authors" | "isbn" | "isbn13">[],
) {
  return books.map((book) => {
    if (book.alreadyOwned) {
      return { ...book, possibleDuplicate: false, duplicateOfTitle: null };
    }

    const hasIsbn = Boolean(preferredIsbn(book.isbn, book.isbn13));
    if (hasIsbn) {
      return { ...book, possibleDuplicate: false, duplicateOfTitle: null };
    }

    const matches = findSimilarBooks(book, library);
    const top = matches[0];
    return {
      ...book,
      possibleDuplicate: Boolean(top),
      duplicateOfTitle: top?.book.title ?? null,
    };
  });
}

export function catalogToInsert(
  book: CatalogBook,
  extras?: {
    location?: string;
    notes?: string;
    reading_status?: ReadingStatus;
  },
): BookInsert {
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
    location: extras?.location || null,
    notes: extras?.notes || null,
    source: book.source,
    reading_status: extras?.reading_status ?? "unread",
  };
}

export function computeStats(books: Book[]): LibraryStats {
  const today = new Date().toISOString().slice(0, 10);
  const byStatus: Record<ReadingStatus, number> = {
    unread: 0,
    reading: 0,
    read: 0,
  };
  const locationMap = new Map<string, number>();
  const authorMap = new Map<string, number>();
  const publisherMap = new Map<string, number>();
  let loanedCount = 0;
  let overdueCount = 0;

  for (const book of books) {
    byStatus[book.reading_status] =
      (byStatus[book.reading_status] ?? 0) + 1;

    if (book.loaned_to) {
      loanedCount += 1;
      if (book.due_at && book.due_at < today) overdueCount += 1;
    }

    const location = book.location?.trim() || "Yer belirtilmemiş";
    locationMap.set(location, (locationMap.get(location) ?? 0) + 1);

    if (book.authors.length) {
      for (const author of book.authors) {
        const key = author.trim();
        if (!key) continue;
        authorMap.set(key, (authorMap.get(key) ?? 0) + 1);
      }
    } else {
      authorMap.set("Yazar bilinmiyor", (authorMap.get("Yazar bilinmiyor") ?? 0) + 1);
    }

    const publisher = book.publisher?.trim() || "Yayınevi yok";
    publisherMap.set(publisher, (publisherMap.get(publisher) ?? 0) + 1);
  }

  const toSorted = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "tr"));

  return {
    total: books.length,
    byStatus,
    loanedCount,
    overdueCount,
    byLocation: toSorted(locationMap).map(({ key, count }) => ({
      location: key,
      count,
    })),
    byAuthor: toSorted(authorMap)
      .slice(0, 20)
      .map(({ key, count }) => ({ author: key, count })),
    byPublisher: toSorted(publisherMap)
      .slice(0, 15)
      .map(({ key, count }) => ({ publisher: key, count })),
    recentlyAdded: [...books]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5),
  };
}

export function groupBooksByLocation(books: Book[]) {
  const groups = new Map<string, Book[]>();
  for (const book of books) {
    const key = book.location?.trim() || "Yer belirtilmemiş";
    const list = groups.get(key) ?? [];
    list.push(book);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([location, items]) => ({
      location,
      books: items.sort((a, b) => a.title.localeCompare(b.title, "tr")),
    }))
    .sort((a, b) => a.location.localeCompare(b.location, "tr"));
}

export function uniqueValues(books: Book[], field: "location" | "publisher") {
  const values = new Set<string>();
  for (const book of books) {
    const value = book[field]?.trim();
    if (value) values.add(value);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "tr"));
}

export function uniqueAuthors(books: Book[]) {
  const values = new Set<string>();
  for (const book of books) {
    for (const author of book.authors) {
      const value = author.trim();
      if (value) values.add(value);
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "tr"));
}

export function isOverdue(book: Book, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(book.loaned_to && book.due_at && book.due_at < today);
}
