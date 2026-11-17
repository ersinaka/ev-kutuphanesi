import { notFound } from "next/navigation";
import { BookDetail } from "@/components/BookDetail";
import { getBook } from "@/lib/books";

export const dynamic = "force-dynamic";

type BookPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();
  return <BookDetail initialBook={book} />;
}
