import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookDetail } from "@/components/BookDetail";
import { getBook } from "@/lib/books";

export const dynamic = "force-dynamic";

type BookPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: BookPageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) return { title: "Kitap bulunamadı" };
  return {
    title: `${book.title} · Ev Kütüphanesi`,
    description: book.authors.length
      ? `${book.authors.join(", ")} — ${book.title}`
      : book.title,
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();
  return <BookDetail initialBook={book} />;
}
