import Link from "next/link";
import { AddBookPanel } from "@/components/AddBookPanel";
import { AddChoice } from "@/components/AddChoice";
import { AddMediaPanel } from "@/components/AddMediaPanel";
import { requireUser } from "@/lib/dal";
import type { ContentType } from "@/lib/types";

export const dynamic = "force-dynamic";

function isContentType(value: string | undefined): value is ContentType {
  return value === "book" || value === "movie" || value === "tv";
}

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireUser();
  const { type } = await searchParams;
  const selected = isContentType(type) ? type : null;

  if (!selected) return <AddChoice />;

  return (
    <section className="stack-lg">
      <div className="add-heading">
        <Link href="/ekle" className="btn btn-ghost btn-sm">
          ← Ne eklemek istiyorsun?
        </Link>
        {selected !== "book" && (
          <Link href="/medya" className="btn btn-ghost btn-sm">
            Medya listem
          </Link>
        )}
      </div>
      {selected === "book" ? (
        <AddBookPanel />
      ) : (
        <AddMediaPanel type={selected} />
      )}
    </section>
  );
}
