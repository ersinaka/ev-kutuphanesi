export type BookSource = "open_library" | "google_books" | "manual";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type BookComment = {
  id: string;
  user_id: string;
  book_id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  isbn: string | null;
  isbn13: string | null;
  rating: number | null;
  body: string;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicReadBook = {
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  isbn13: string | null;
  rating: number | null;
  finished_at: string | null;
  review: string | null;
  sort_at: string | null;
};

export type ReadingStatus = "unread" | "reading" | "read";

export type Book = {
  id: string;
  user_id?: string | null;
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

export type ContentType = "book" | "movie" | "tv";
export type MediaType = Exclude<ContentType, "book">;
export type WatchStatus = "planned" | "watching" | "watched";

export type MediaSearchResult = {
  tmdb_id: number;
  type: MediaType;
  title: string;
  original_title: string | null;
  release_date: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string | null;
  vote_average: number | null;
  genre_ids: number[];
  adult: boolean;
  alreadyOwned?: boolean;
};

export type MediaItem = {
  id: string;
  user_id?: string | null;
  content_type: MediaType;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  release_date: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language: string | null;
  vote_average: number | null;
  genre_ids: number[];
  metadata: Record<string, unknown>;
  watch_status: WatchStatus;
  rating: number | null;
  review: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaInsert = {
  content_type: MediaType;
  tmdb_id: number;
  title: string;
  original_title?: string | null;
  release_date?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  original_language?: string | null;
  vote_average?: number | null;
  genre_ids?: number[];
  metadata?: Record<string, unknown>;
  watch_status?: WatchStatus;
  rating?: number | null;
  review?: string | null;
};

export type MediaUpdate = Partial<MediaInsert>;

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  book: "Kitap",
  movie: "Film",
  tv: "Dizi",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: "Film",
  tv: "Dizi",
};

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  planned: "İzlenecek",
  watching: "İzleniyor",
  watched: "İzledim",
};
