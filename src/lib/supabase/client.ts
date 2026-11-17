import { createBrowserClient } from "@supabase/ssr";
import type { Book, BookInsert, BookComment, Profile } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase ortam değişkenleri eksik.");
}

/** Browser client. Session is stored in cookies so SSR can read it too. */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type BooksTable = {
  Row: Book;
  Insert: BookInsert;
  Update: Partial<BookInsert>;
};

export type ProfilesTable = {
  Row: Profile;
  Insert: Partial<Profile>;
  Update: Partial<Profile>;
};

export type CommentsTable = {
  Row: BookComment;
  Insert: Partial<BookComment>;
  Update: Partial<BookComment>;
};
