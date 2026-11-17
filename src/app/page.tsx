import { LibraryGrid } from "@/components/LibraryGrid";
import { listBooks } from "@/lib/books";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let books: Book[] = [];
  let loadError: string | null = null;

  try {
    books = await listBooks();
  } catch {
    loadError = "Kütüphane yüklenemedi. Supabase bağlantısını kontrol et.";
  }

  return (
    <div className="stack-md">
      {loadError ? <p className="alert alert-error">{loadError}</p> : null}
      <LibraryGrid initialBooks={books} />
    </div>
  );
}
