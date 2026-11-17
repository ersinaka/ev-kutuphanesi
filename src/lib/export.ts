import type { Book, BookInsert, BookSource, ReadingStatus } from "@/lib/types";

const EXPORT_FIELDS = [
  "title",
  "authors",
  "isbn",
  "isbn13",
  "cover_url",
  "publisher",
  "published_date",
  "page_count",
  "description",
  "location",
  "notes",
  "source",
  "reading_status",
  "loaned_to",
  "loaned_at",
  "due_at",
  "created_at",
] as const;

type ExportField = (typeof EXPORT_FIELDS)[number];

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function fieldValue(book: Book, field: ExportField): string {
  const value = book[field];
  if (Array.isArray(value)) return value.join("; ");
  if (value == null) return "";
  return String(value);
}

export function booksToJson(books: Book[]) {
  return JSON.stringify(
    books.map((book) => {
      const row: Record<string, unknown> = {};
      for (const field of EXPORT_FIELDS) {
        row[field] = book[field];
      }
      return row;
    }),
    null,
    2,
  );
}

export function booksToCsv(books: Book[]) {
  const header = EXPORT_FIELDS.join(",");
  const rows = books.map((book) =>
    EXPORT_FIELDS.map((field) => csvEscape(fieldValue(book, field))).join(","),
  );
  return [header, ...rows].join("\n");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function asSource(value: string | undefined): BookSource {
  if (value === "open_library" || value === "google_books" || value === "manual") {
    return value;
  }
  return "manual";
}

function asStatus(value: string | undefined): ReadingStatus {
  if (value === "unread" || value === "reading" || value === "read") {
    return value;
  }
  return "unread";
}

function rowToInsert(row: Record<string, string>): BookInsert | null {
  const title = row.title?.trim();
  if (!title) return null;

  const authors = (row.authors ?? "")
    .split(/[;|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const pageCount = row.page_count ? Number(row.page_count) : null;

  return {
    title,
    authors,
    isbn: row.isbn || null,
    isbn13: row.isbn13 || null,
    cover_url: row.cover_url || null,
    publisher: row.publisher || null,
    published_date: row.published_date || null,
    page_count: Number.isFinite(pageCount) ? pageCount : null,
    description: row.description || null,
    location: row.location || null,
    notes: row.notes || null,
    source: asSource(row.source),
    reading_status: asStatus(row.reading_status),
    loaned_to: row.loaned_to || null,
    loaned_at: row.loaned_at || null,
    due_at: row.due_at || null,
  };
}

export function parseImportJson(text: string): BookInsert[] {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record: Record<string, string> = {};
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          record[key] = value.join("; ");
        } else if (value == null) {
          record[key] = "";
        } else {
          record[key] = String(value);
        }
      }
      return rowToInsert(record);
    })
    .filter((row): row is BookInsert => Boolean(row));
}

export function parseImportCsv(text: string): BookInsert[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const books: BookInsert[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    const insert = rowToInsert(row);
    if (insert) books.push(insert);
  }

  return books;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
