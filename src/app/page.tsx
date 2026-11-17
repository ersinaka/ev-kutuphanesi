import { LibraryGrid } from "@/components/LibraryGrid";
import { listMyBooks, requireUser } from "@/lib/dal";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireUser();
  let books: Book[] = [];
  let loadError: string | null = null;

  try {
    books = await listMyBooks();
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
