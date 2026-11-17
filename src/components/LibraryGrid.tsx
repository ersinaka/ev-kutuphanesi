"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  deleteBook,
  isOverdue,
  uniqueAuthors,
  uniqueValues,
  updateBook,
} from "@/lib/books";
import type { Book, LibrarySort, ReadingStatus } from "@/lib/types";
import { READING_STATUS_LABELS } from "@/lib/types";
import { BookCover } from "@/components/BookCover";

type LibraryGridProps = {
  initialBooks: Book[];
};

type ViewMode = "shelves" | "cabinets";

function sortBooks(books: Book[], sort: LibrarySort) {
  const copy = [...books];
  switch (sort) {
    case "oldest":
      return copy.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    case "title_asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "tr"));
    case "title_desc":
      return copy.sort((a, b) => b.title.localeCompare(a.title, "tr"));
    case "author_asc":
      return copy.sort((a, b) =>
        (a.authors[0] ?? "").localeCompare(b.authors[0] ?? "", "tr"),
      );
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
}

function chunkBooks(books: Book[], size: number) {
  const rows: Book[][] = [];
  for (let i = 0; i < books.length; i += size) {
    rows.push(books.slice(i, i + size));
  }
  return rows;
}

export function LibraryGrid({ initialBooks }: LibraryGridProps) {
  const [books, setBooks] = useState(initialBooks);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("all");
  const [author, setAuthor] = useState("all");
  const [publisher, setPublisher] = useState("all");
  const [readingStatus, setReadingStatus] = useState<ReadingStatus | "all">(
    "all",
  );
  const [loaned, setLoaned] = useState<"all" | "yes" | "no">("all");
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [view, setView] = useState<ViewMode>("shelves");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locations = useMemo(() => uniqueValues(books, "location"), [books]);
  const authors = useMemo(() => uniqueAuthors(books), [books]);
  const publishers = useMemo(() => uniqueValues(books, "publisher"), [books]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("tr");

    const list = books.filter((book) => {
      if (location !== "all" && (book.location ?? "") !== location) return false;
      if (publisher !== "all" && (book.publisher ?? "") !== publisher) {
        return false;
      }
      if (author !== "all" && !book.authors.includes(author)) return false;
      if (readingStatus !== "all" && book.reading_status !== readingStatus) {
        return false;
      }
      if (loaned === "yes" && !book.loaned_to) return false;
      if (loaned === "no" && book.loaned_to) return false;

      if (!term) return true;

      const haystack = [
        book.title,
        book.authors.join(" "),
        book.isbn ?? "",
        book.isbn13 ?? "",
        book.location ?? "",
        book.notes ?? "",
        book.publisher ?? "",
        book.loaned_to ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr");

      return haystack.includes(term);
    });

    return sortBooks(list, sort);
  }, [
    books,
    query,
    location,
    author,
    publisher,
    readingStatus,
    loaned,
    sort,
  ]);

  const shelfGroups = useMemo(() => {
    const map = new Map<string, Book[]>();
    for (const book of filtered) {
      const key = book.location?.trim() || "Yer belirtilmemiş";
      const list = map.get(key) ?? [];
      list.push(book);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .map(([shelf, items]) => ({ shelf, items }))
      .sort((a, b) => a.shelf.localeCompare(b.shelf, "tr"));
  }, [filtered]);

  function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(`"${title}" kütüphaneden silinsin mi?`);
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteBook(id);
        setBooks((current) => current.filter((book) => book.id !== id));
        setActiveId(null);
        setMessage("Kitap silindi.");
      } catch {
        setMessage("Silme işlemi başarısız oldu.");
      }
    });
  }

  function cycleStatus(book: Book) {
    const order: ReadingStatus[] = ["unread", "reading", "read"];
    const next = order[(order.indexOf(book.reading_status) + 1) % order.length];

    startTransition(async () => {
      try {
        const updated = await updateBook(book.id, { reading_status: next });
        setBooks((current) =>
          current.map((item) => (item.id === book.id ? updated : item)),
        );
        setMessage(`Durum: ${READING_STATUS_LABELS[next]}`);
      } catch {
        setMessage("Durum güncellenemedi.");
      }
    });
  }

  function renderShelfPanel(book: Book) {
    return (
      <div className="shelf-book-panel" role="dialog" aria-label={book.title}>
        <div className="shelf-panel-cover">
          <BookCover
            title={book.title}
            coverUrl={book.cover_url}
            variant={book.cover_url ? "cover" : "spine"}
          />
        </div>
        <div className="stack-sm">
          <Link href={`/kitap/${book.id}`}>
            <h2 className="book-title">{book.title}</h2>
          </Link>
          <p className="book-meta">
            {book.authors.length
              ? book.authors.join(", ")
              : "Yazar bilinmiyor"}
          </p>

          <div className="chip-row">
            <button
              type="button"
              className="chip chip-accent chip-button"
              disabled={pending}
              onClick={() => cycleStatus(book)}
            >
              {READING_STATUS_LABELS[book.reading_status]}
            </button>
            {book.rating && book.reading_status === "read" ? (
              <span className="chip chip-warn">{"★".repeat(book.rating)}</span>
            ) : null}
            {book.location ? (
              <span className="chip chip-accent">{book.location}</span>
            ) : null}
            {book.loaned_to ? (
              <span className={`chip ${isOverdue(book) ? "chip-warn" : ""}`}>
                {isOverdue(book) ? "Gecikmiş · " : "Ödünç · "}
                {book.loaned_to}
              </span>
            ) : null}
          </div>

          {book.review && book.reading_status === "read" ? (
            <p className="clamp-2">{book.review}</p>
          ) : null}

          <div className="action-row">
            <Link href={`/kitap/${book.id}`} className="btn btn-primary">
              Kitap sayfası
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setActiveId(null)}
            >
              Kapat
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleDelete(book.id, book.title)}
              className="btn btn-danger"
            >
              Sil
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderShelfBook(book: Book) {
    const open = activeId === book.id;

    return (
      <article
        key={book.id}
        className={`shelf-book${open ? " is-open" : ""}`}
      >
        <button
          type="button"
          className="shelf-book-face"
          aria-expanded={open}
          aria-label={book.title}
          onClick={() => setActiveId(open ? null : book.id)}
        >
          <span className="shelf-book-cover">
            <BookCover
              title={book.title}
              coverUrl={book.cover_url}
              variant={book.cover_url ? "cover" : "spine"}
            />
          </span>
          <span className="shelf-book-shadow" aria-hidden />
        </button>
      </article>
    );
  }

  function renderShelfBay(label: string | null, items: Book[]) {
    const rows = chunkBooks(items, 8);
    return (
      <section className="shelf-bay">
        {label ? (
          <div className="shelf-label">
            <h2 className="section-title">{label}</h2>
            <span className="muted-note">{items.length} kitap</span>
          </div>
        ) : null}
        {rows.map((row, index) => {
          const activeBook = row.find((book) => book.id === activeId) ?? null;
          return (
            <div key={`${label ?? "all"}-${index}`} className="shelf-unit">
              <div className="shelf-back" aria-hidden />
              <div className="shelf-row">{row.map(renderShelfBook)}</div>
              <div className="shelf-board" aria-hidden>
                <span className="shelf-lip" />
              </div>
              {activeBook ? renderShelfPanel(activeBook) : null}
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className="stack-lg">
      <div className="page-hero">
        <div className="page-copy">
          <h1 className="page-title">
            Evdeki
            <br />
            kitaplar
          </h1>
        </div>

        <div className="stat-chip">
          <strong>{filtered.length}</strong> / {books.length} kitap
        </div>
      </div>

      <div className="toolbar panel-wood">
        <label className="field toolbar-search">
          <span className="field-label">Rafta ara</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Başlık, yazar, ISBN, yer, ödünç..."
            className="input"
          />
        </label>

        <div className="filter-grid">
          <label className="field">
            <span className="field-label">Yer</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="input"
            >
              <option value="all">Tümü</option>
              {locations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Yazar</span>
            <select
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              className="input"
            >
              <option value="all">Tümü</option>
              {authors.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Yayınevi</span>
            <select
              value={publisher}
              onChange={(event) => setPublisher(event.target.value)}
              className="input"
            >
              <option value="all">Tümü</option>
              {publishers.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Okuma</span>
            <select
              value={readingStatus}
              onChange={(event) =>
                setReadingStatus(event.target.value as ReadingStatus | "all")
              }
              className="input"
            >
              <option value="all">Tümü</option>
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
            <span className="field-label">Ödünç</span>
            <select
              value={loaned}
              onChange={(event) =>
                setLoaned(event.target.value as "all" | "yes" | "no")
              }
              className="input"
            >
              <option value="all">Tümü</option>
              <option value="yes">Ödünçte</option>
              <option value="no">Evde</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Sırala</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as LibrarySort)}
              className="input"
            >
              <option value="newest">Yeni eklenen</option>
              <option value="oldest">Eski eklenen</option>
              <option value="title_asc">Başlık A-Z</option>
              <option value="title_desc">Başlık Z-A</option>
              <option value="author_asc">Yazar A-Z</option>
            </select>
          </label>
        </div>

        <div className="view-toggle">
          <button
            type="button"
            className={`btn btn-ghost${view === "shelves" ? " is-active" : ""}`}
            onClick={() => setView("shelves")}
          >
            Tek raf
          </button>
          <button
            type="button"
            className={`btn btn-ghost${view === "cabinets" ? " is-active" : ""}`}
            onClick={() => setView("cabinets")}
          >
            Oda oda
          </button>
        </div>
      </div>

      {message ? <p className="alert alert-ok">{message}</p> : null}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h2>
            {books.length === 0
              ? "Raf boş"
              : "Bu filtreye uygun kitap yok"}
          </h2>
          <p>
            {books.length === 0
              ? "ISBN veya isimle ara, bulamazsan elle ekle."
              : "Filtreleri temizle veya farklı bir kelime dene."}
          </p>
        </div>
      ) : view === "shelves" ? (
        renderShelfBay(null, filtered)
      ) : (
        <div className="stack-lg">
          {shelfGroups.map((group) => (
            <div key={group.shelf}>
              {renderShelfBay(group.shelf, group.items)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
