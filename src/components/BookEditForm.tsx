"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateBook } from "@/lib/books";
import type { Book, ReadingStatus } from "@/lib/types";
import { READING_STATUS_LABELS } from "@/lib/types";

type BookEditFormProps = {
  book: Book;
  onUpdated: (book: Book) => void;
};

export function BookEditForm({ book, onUpdated }: BookEditFormProps) {
  const [title, setTitle] = useState(book.title);
  const [authors, setAuthors] = useState(book.authors.join(", "));
  const [isbn, setIsbn] = useState(book.isbn ?? "");
  const [isbn13, setIsbn13] = useState(book.isbn13 ?? "");
  const [publisher, setPublisher] = useState(book.publisher ?? "");
  const [publishedDate, setPublishedDate] = useState(book.published_date ?? "");
  const [pageCount, setPageCount] = useState(
    book.page_count != null ? String(book.page_count) : "",
  );
  const [location, setLocation] = useState(book.location ?? "");
  const [notes, setNotes] = useState(book.notes ?? "");
  const [description, setDescription] = useState(book.description ?? "");
  const [coverUrl, setCoverUrl] = useState(book.cover_url ?? "");
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>(
    book.reading_status,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Başlık zorunlu.");
      return;
    }

    startTransition(async () => {
      try {
        const updated = await updateBook(book.id, {
          title,
          authors: authors
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
          isbn: isbn || null,
          isbn13: isbn13 || null,
          publisher: publisher || null,
          published_date: publishedDate || null,
          page_count: pageCount ? Number(pageCount) : null,
          location: location || null,
          notes: notes || null,
          description: description || null,
          cover_url: coverUrl || null,
          reading_status: readingStatus,
        });
        onUpdated(updated);
        setMessage("Kitap güncellendi.");
        setError(null);
      } catch (err) {
        const text =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Güncelleme başarısız.";
        setError(text);
      }
    });
  }

  return (
    <form onSubmit={save} className="panel field-grid">
      <h2 className="section-title field-span-2">Düzenle</h2>

      <label className="field field-span-2">
        <span className="field-label">Başlık *</span>
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field field-span-2">
        <span className="field-label">Yazarlar (virgül ile)</span>
        <input
          value={authors}
          onChange={(event) => setAuthors(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field">
        <span className="field-label">ISBN-10</span>
        <input
          value={isbn}
          onChange={(event) => setIsbn(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field">
        <span className="field-label">ISBN-13</span>
        <input
          value={isbn13}
          onChange={(event) => setIsbn13(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field">
        <span className="field-label">Yayınevi</span>
        <input
          value={publisher}
          onChange={(event) => setPublisher(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field">
        <span className="field-label">Yayın tarihi</span>
        <input
          value={publishedDate}
          onChange={(event) => setPublishedDate(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field">
        <span className="field-label">Sayfa</span>
        <input
          type="number"
          min={1}
          value={pageCount}
          onChange={(event) => setPageCount(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field">
        <span className="field-label">Okuma durumu</span>
        <select
          value={readingStatus}
          onChange={(event) =>
            setReadingStatus(event.target.value as ReadingStatus)
          }
          className="input input-muted"
        >
          {(Object.keys(READING_STATUS_LABELS) as ReadingStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {READING_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Yer (raf / oda)</span>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field">
        <span className="field-label">Kapak URL</span>
        <input
          value={coverUrl}
          onChange={(event) => setCoverUrl(event.target.value)}
          className="input input-muted"
        />
      </label>

      <label className="field field-span-2">
        <span className="field-label">Açıklama</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="textarea input-muted"
        />
      </label>

      <label className="field field-span-2">
        <span className="field-label">Not</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="textarea input-muted"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary field-span-2"
      >
        {pending ? "Kaydediliyor..." : "Değişiklikleri kaydet"}
      </button>

      {message ? (
        <p className="alert alert-ok field-span-2">{message}</p>
      ) : null}
      {error ? (
        <p className="alert alert-error field-span-2">{error}</p>
      ) : null}
    </form>
  );
}
