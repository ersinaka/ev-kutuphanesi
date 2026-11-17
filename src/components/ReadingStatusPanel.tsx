"use client";

import { useState, useTransition } from "react";
import { updateBook } from "@/lib/books";
import type { Book, ReadingStatus } from "@/lib/types";
import { READING_STATUS_LABELS } from "@/lib/types";

type ReadingStatusPanelProps = {
  book: Book;
  onUpdated: (book: Book) => void;
  compact?: boolean;
};

const STATUSES: ReadingStatus[] = ["unread", "reading", "read"];

export function ReadingStatusPanel({
  book,
  onUpdated,
  compact = false,
}: ReadingStatusPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setStatus(status: ReadingStatus) {
    if (status === book.reading_status) return;

    startTransition(async () => {
      try {
        const payload: {
          reading_status: ReadingStatus;
          finished_at?: string | null;
          review?: string | null;
          rating?: number | null;
        } = { reading_status: status };

        if (status === "read") {
          payload.finished_at =
            book.finished_at || new Date().toISOString().slice(0, 10);
        } else {
          payload.finished_at = null;
          if (status === "unread") {
            payload.review = null;
            payload.rating = null;
          }
        }

        const updated = await updateBook(book.id, payload);
        onUpdated(updated);
        setMessage(`Durum: ${READING_STATUS_LABELS[status]}`);
        setError(null);
      } catch {
        setError("Durum güncellenemedi.");
      }
    });
  }

  const toggle = (
    <div className="status-toggle" role="group" aria-label="Okuma durumu">
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          disabled={pending}
          aria-pressed={book.reading_status === status}
          className={`status-btn${book.reading_status === status ? " is-active" : ""}`}
          onClick={() => setStatus(status)}
        >
          {READING_STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="status-inline">
        {toggle}
        {message ? (
          <span className="inline-note inline-ok">{message}</span>
        ) : null}
        {error ? (
          <span className="inline-note inline-error">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <section className="panel stack-md">
      <h2 className="section-title">Okuma durumu</h2>
      <p className="muted-note">Kitabı okudun mu, okuyor musun, yoksa sırada mı?</p>
      {toggle}
      {book.finished_at && book.reading_status === "read" ? (
        <p className="muted-note">Bitirme: {book.finished_at}</p>
      ) : null}
      {message ? <p className="alert alert-ok">{message}</p> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
    </section>
  );
}
