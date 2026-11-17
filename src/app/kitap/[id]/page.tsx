import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookDetail } from "@/components/BookDetail";
import { getMyBook, requireUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

type BookPageProps = {
  params: Promise<{ id: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Kitap bulunamadı" };

  try {
    const book = await getMyBook(id);
    if (!book) return { title: "Kitap bulunamadı" };
    return {
      title: `${book.title} · Ev Kütüphanesi`,
      description: book.authors.length
        ? `${book.authors.join(", ")} — ${book.title}`
        : book.title,
    };
  } catch {
    return { title: "Kitap bulunamadı" };
  }
}

export default async function BookPage({ params }: BookPageProps) {
  await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const book = await getMyBook(id);
  if (!book) notFound();
  return <BookDetail initialBook={book} />;
}
