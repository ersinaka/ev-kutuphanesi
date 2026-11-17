export type BookSource = "open_library" | "google_books" | "manual";

export type ReadingStatus = "unread" | "reading" | "read";

export type Book = {
  id: string;
  title: string;
  authors: string[];
  isbn: string | null;
  isbn13: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  description: string | null;
  location: string | null;
  notes: string | null;
  source: BookSource;
  reading_status: ReadingStatus;
  review: string | null;
  rating: number | null;
  finished_at: string | null;
  loaned_to: string | null;
  loaned_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BookInsert = {
  title: string;
  authors?: string[];
  isbn?: string | null;
  isbn13?: string | null;
  cover_url?: string | null;
  publisher?: string | null;
  published_date?: string | null;
  page_count?: number | null;
  description?: string | null;
  location?: string | null;
  notes?: string | null;
  source?: BookSource;
  reading_status?: ReadingStatus;
  review?: string | null;
  rating?: number | null;
  finished_at?: string | null;
  loaned_to?: string | null;
  loaned_at?: string | null;
  due_at?: string | null;
};

export type BookUpdate = Partial<BookInsert> & {
  title?: string;
};

export type CatalogBook = {
  title: string;
  authors: string[];
  isbn: string | null;
  isbn13: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  description: string | null;
  source: Exclude<BookSource, "manual">;
  alreadyOwned?: boolean;
  possibleDuplicate?: boolean;
  duplicateOfTitle?: string | null;
};

export type LibrarySort =
  | "newest"
  | "oldest"
  | "title_asc"
  | "title_desc"
  | "author_asc";

export type LibraryFilters = {
  location?: string;
  author?: string;
  publisher?: string;
  readingStatus?: ReadingStatus | "all";
  loaned?: "all" | "yes" | "no";
  sort?: LibrarySort;
};

export type LibraryStats = {
  total: number;
  byStatus: Record<ReadingStatus, number>;
  loanedCount: number;
  overdueCount: number;
  byLocation: { location: string; count: number }[];
  byAuthor: { author: string; count: number }[];
  byPublisher: { publisher: string; count: number }[];
  recentlyAdded: Book[];
};

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  unread: "Okunacak",
  reading: "Okunuyor",
  read: "Okundu",
};
