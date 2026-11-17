import { StatsPanel } from "@/components/StatsPanel";
import { listBooks } from "@/lib/books";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  let books: Book[] = [];
  let loadError: string | null = null;

  try {
    books = await listBooks();
  } catch {
    loadError = "İstatistikler yüklenemedi.";
  }

  return (
    <div className="stack-md">
      {loadError ? <p className="alert alert-error">{loadError}</p> : null}
      <StatsPanel books={books} />
    </div>
  );
}
