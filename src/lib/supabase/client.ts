import { createClient } from "@supabase/supabase-js";
import type { Book, BookInsert } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase ortam değişkenleri eksik.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type BooksTable = {
  Row: Book;
  Insert: BookInsert;
  Update: Partial<BookInsert>;
};
