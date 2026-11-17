import { ImportExportPanel } from "@/components/ImportExportPanel";
import { listBooks } from "@/lib/books";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  let books: Book[] = [];
  let loadError: string | null = null;

  try {
    books = await listBooks();
  } catch {
    loadError = "Yedek verisi yüklenemedi.";
  }

  return (
    <div className="stack-md">
      {loadError ? <p className="alert alert-error">{loadError}</p> : null}
      <ImportExportPanel books={books} />
    </div>
  );
}
