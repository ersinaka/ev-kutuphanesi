import { ImportExportPanel } from "@/components/ImportExportPanel";
import { listMyBooks, requireUser } from "@/lib/dal";
import type { Book } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  await requireUser();
  let books: Book[] = [];
  let loadError: string | null = null;

  try {
    books = await listMyBooks();
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
