"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBook, isOverdue } from "@/lib/books";
import type { Book } from "@/lib/types";
import { READING_STATUS_LABELS } from "@/lib/types";
import { BookCover } from "@/components/BookCover";
import { BookEditForm } from "@/components/BookEditForm";
import { LoanPanel } from "@/components/LoanPanel";
import { ReadingStatusPanel } from "@/components/ReadingStatusPanel";
import { ReviewPanel } from "@/components/ReviewPanel";

type BookDetailProps = {
  initialBook: Book;
};

export function BookDetail({ initialBook }: BookDetailProps) {
  const router = useRouter();
  const [book, setBook] = useState(initialBook);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`"${book.title}" silinsin mi?`);
    if (!confirmed) return;

    startTransition(async () => {
      await deleteBook(book.id);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="stack-lg">
      <div className="detail-hero">
        <div className="detail-cover-wrap">
          <div className="detail-cover">
            <BookCover title={book.title} coverUrl={book.cover_url} />
          </div>
          <div className="detail-shelf" aria-hidden />
        </div>

        <div className="stack-md">
          <div className="page-copy">
            <p className="eyebrow">
              <Link href="/">← Raflar</Link>
            </p>
            <h1 className="page-title">{book.title}</h1>
            <p className="page-lead">
              {book.authors.length
                ? book.authors.join(", ")
                : "Yazar bilinmiyor"}
            </p>
          </div>

          <div className="chip-row">
            <span className="chip chip-accent">
              {READING_STATUS_LABELS[book.reading_status]}
            </span>
            {book.rating ? (
              <span className="chip chip-warn">
                {"★".repeat(book.rating)}
              </span>
            ) : null}
            {book.location ? (
              <span className="chip">{book.location}</span>
            ) : null}
            {book.isbn13 || book.isbn ? (
              <span className="chip chip-mono">
                {book.isbn13 || book.isbn}
              </span>
            ) : null}
            {book.loaned_to ? (
              <span className={`chip ${isOverdue(book) ? "chip-warn" : ""}`}>
                {isOverdue(book) ? "Gecikmiş · " : "Ödünç · "}
                {book.loaned_to}
              </span>
            ) : null}
          </div>

          <dl className="meta-list">
            {book.publisher ? (
              <>
                <dt>Yayınevi</dt>
                <dd>{book.publisher}</dd>
              </>
            ) : null}
            {book.published_date ? (
              <>
                <dt>Yayın</dt>
                <dd>{book.published_date}</dd>
              </>
            ) : null}
            {book.page_count ? (
              <>
                <dt>Sayfa</dt>
                <dd>{book.page_count}</dd>
              </>
            ) : null}
            {book.finished_at && book.reading_status === "read" ? (
              <>
                <dt>Bitti</dt>
                <dd>{book.finished_at}</dd>
              </>
            ) : null}
            {book.loaned_at ? (
              <>
                <dt>Veriliş</dt>
                <dd>{book.loaned_at}</dd>
              </>
            ) : null}
            {book.due_at ? (
              <>
                <dt>Dönüş</dt>
                <dd>{book.due_at}</dd>
              </>
            ) : null}
          </dl>

          {book.description ? (
            <p className="detail-description">{book.description}</p>
          ) : null}
          {book.notes ? (
            <p className="alert alert-ok">Not: {book.notes}</p>
          ) : null}
          {book.review && book.reading_status === "read" ? (
            <blockquote className="review-quote">
              {book.rating ? (
                <p className="review-score">{"★".repeat(book.rating)}</p>
              ) : null}
              <p>{book.review}</p>
            </blockquote>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            className="btn btn-danger"
          >
            Sil
          </button>
        </div>
      </div>

      <ReadingStatusPanel book={book} onUpdated={setBook} />
      <ReviewPanel book={book} onUpdated={setBook} />
      <LoanPanel book={book} onUpdated={setBook} />
      <BookEditForm book={book} onUpdated={setBook} />
    </div>
  );
}
