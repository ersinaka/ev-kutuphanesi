"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateBook } from "@/lib/books";
import type { Book } from "@/lib/types";

type ReviewPanelProps = {
  book: Book;
  onUpdated: (book: Book) => void;
};

export function ReviewPanel({ book, onUpdated }: ReviewPanelProps) {
  const [review, setReview] = useState(book.review ?? "");
  const [rating, setRating] = useState(book.rating ?? 0);
  const [finishedAt, setFinishedAt] = useState(
    book.finished_at ?? new Date().toISOString().slice(0, 10),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [synced, setSynced] = useState({
    id: book.id,
    review: book.review,
    rating: book.rating,
    finishedAt: book.finished_at,
  });

  if (
    synced.id !== book.id ||
    synced.review !== book.review ||
    synced.rating !== book.rating ||
    synced.finishedAt !== book.finished_at
  ) {
    setSynced({
      id: book.id,
      review: book.review,
      rating: book.rating,
      finishedAt: book.finished_at,
    });
    setReview(book.review ?? "");
    setRating(book.rating ?? 0);
    setFinishedAt(book.finished_at ?? new Date().toISOString().slice(0, 10));
  }

  if (book.reading_status !== "read") {
    return (
      <section className="panel stack-md">
        <h2 className="section-title">Yorum</h2>
        <p className="muted-note">
          Yorum bırakmak için kitabı önce <strong>Okundu</strong> olarak işaretle.
        </p>
      </section>
    );
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (!review.trim() && !rating) {
      setError("Yorum veya puan gir.");
      return;
    }

    startTransition(async () => {
      try {
        const updated = await updateBook(book.id, {
          review: review.trim() || null,
          rating: rating || null,
          finished_at: finishedAt || null,
          reading_status: "read",
        });
        onUpdated(updated);
        setMessage("Yorum kaydedildi.");
        setError(null);
      } catch {
        setError("Yorum kaydedilemedi.");
      }
    });
  }

  function clearReview() {
    startTransition(async () => {
      try {
        const updated = await updateBook(book.id, {
          review: null,
          rating: null,
        });
        onUpdated(updated);
        setReview("");
        setRating(0);
        setMessage("Yorum silindi.");
        setError(null);
      } catch {
        setError("Yorum silinemedi.");
      }
    });
  }

  return (
    <section className="panel stack-md">
      <h2 className="section-title">Okuma yorumu</h2>
      <p className="muted-note">
        Beğendin mi, ne hissettin? Kısa bir not bırak.
      </p>

      <form onSubmit={save} className="stack-md">
        <div className="field">
          <span className="field-label">Puan</span>
          <div className="rating-row" role="group" aria-label="Puan">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`rating-star${rating >= value ? " is-on" : ""}`}
                aria-label={`${value} yıldız`}
                aria-pressed={rating >= value}
                onClick={() => setRating(rating === value ? 0 : value)}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Yorum</span>
          <textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            rows={5}
            placeholder="Örnek: İkinci yarısı çok güçlüydü, tekrar okurum."
            className="textarea input-muted"
          />
        </label>

        <label className="field">
          <span className="field-label">Bitirme tarihi</span>
          <input
            type="date"
            value={finishedAt}
            onChange={(event) => setFinishedAt(event.target.value)}
            className="input input-muted"
          />
        </label>

        <div className="action-row">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Kaydediliyor..." : "Yorumu kaydet"}
          </button>
          {book.review || book.rating ? (
            <button
              type="button"
              disabled={pending}
              onClick={clearReview}
              className="btn btn-ghost"
            >
              Yorumu sil
            </button>
          ) : null}
        </div>
      </form>

      {book.review ? (
        <blockquote className="review-quote">
          {book.rating ? (
            <p className="review-score">{"★".repeat(book.rating)}</p>
          ) : null}
          <p>{book.review}</p>
        </blockquote>
      ) : null}

      {message ? <p className="alert alert-ok">{message}</p> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
    </section>
  );
}
