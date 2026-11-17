"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  addBook,
  catalogToInsert,
  findOwnedMatches,
  listBooks,
  markOwned,
  markPossibleDuplicates,
} from "@/lib/books";
import {
  getClientCatalogCache,
  setClientCatalogCache,
} from "@/lib/catalog/client-cache";
import { looksLikeIsbn } from "@/lib/isbn";
import { findSimilarBooks } from "@/lib/similarity";
import type { Book, CatalogBook } from "@/lib/types";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BookCover } from "@/components/BookCover";
import { BulkIsbnAdd } from "@/components/BulkIsbnAdd";

const DEBOUNCE_MS = 350;

type ManualForm = {
  title: string;
  authors: string;
  isbn: string;
  isbn13: string;
  publisher: string;
  published_date: string;
  page_count: string;
  location: string;
  notes: string;
  description: string;
  cover_url: string;
};

const emptyManual: ManualForm = {
  title: "",
  authors: "",
  isbn: "",
  isbn13: "",
  publisher: "",
  published_date: "",
  page_count: "",
  location: "",
  notes: "",
  description: "",
  cover_url: "",
};

export function AddBookPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [manual, setManual] = useState<ManualForm>(emptyManual);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualWarning, setManualWarning] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showManual, setShowManual] = useState(false);
  const [forceManual, setForceManual] = useState(false);
  const libraryRef = useRef<{ at: number; books: Book[] } | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef("");

  const getLibrary = useCallback(async () => {
    const cached = libraryRef.current;
    if (cached && Date.now() - cached.at < 60_000) {
      return cached.books;
    }
    const books = await listBooks();
    libraryRef.current = { at: Date.now(), books };
    return books;
  }, []);

  const runCatalogSearch = useCallback(
    async (term: string, options?: { silent?: boolean }) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) return;

      const requestId = ++requestIdRef.current;
      lastSearchedRef.current = trimmed;
      setQuery(trimmed);
      setError(null);
      if (!options?.silent) setStatus(null);
      setSearching(true);

      try {
        const cached = getClientCatalogCache(trimmed);
        let catalog = cached;

        if (!catalog) {
          const response = await fetch(
            `/api/catalog/search?q=${encodeURIComponent(trimmed)}`,
          );
          const data = (await response.json()) as {
            results?: CatalogBook[];
            error?: string;
            cache?: string;
          };

          if (!response.ok) {
            throw new Error(data.error || "Arama başarısız.");
          }

          catalog = data.results ?? [];
          if (catalog.length) {
            setClientCatalogCache(trimmed, catalog);
          }

          if (data.cache && data.cache !== "miss") {
            setStatus(
              catalog.length
                ? `${catalog.length} sonuç (önbellek).`
                : "Sonuç yok. Manuel ekleme formunu kullan.",
            );
          }
        }

        if (requestId !== requestIdRef.current) return;

        const [owned, library] = await Promise.all([
          findOwnedMatches(catalog),
          getLibrary(),
        ]);
        if (requestId !== requestIdRef.current) return;

        const withOwned = markOwned(catalog, owned);
        const withDupes = markPossibleDuplicates(withOwned, library);
        setResults(withDupes);
        setShowManual(withDupes.length === 0);
        setStatus((current) =>
          current?.includes("önbellek")
            ? current
            : withDupes.length
              ? `${withDupes.length} sonuç bulundu.`
              : "Sonuç yok. Manuel ekleme formunu kullan.",
        );
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Arama başarısız.");
        setResults([]);
        setShowManual(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setSearching(false);
        }
      }
    },
    [getLibrary],
  );

  const handleScan = useCallback(
    (isbn: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void runCatalogSearch(isbn);
    },
    [runCatalogSearch],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    const ready =
      trimmed.length >= 3 || (looksLikeIsbn(trimmed) && trimmed.length >= 10);
    if (!ready || trimmed === lastSearchedRef.current) return;

    debounceRef.current = setTimeout(() => {
      void runCatalogSearch(trimmed, { silent: true });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runCatalogSearch]);

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await runCatalogSearch(query);
  }

  function saveCatalogBook(book: CatalogBook, allowDuplicate = false) {
    if (book.alreadyOwned) {
      setError("Bu kitap zaten kütüphanede.");
      return;
    }
    if (book.possibleDuplicate && !allowDuplicate) {
      setError(
        `Benzer kayıt olabilir: "${book.duplicateOfTitle}". Yine de eklemek için tekrar bas.`,
      );
      setResults((current) =>
        current.map((item) =>
          item === book ? { ...item, possibleDuplicate: false } : item,
        ),
      );
      return;
    }

    startTransition(async () => {
      try {
        await addBook(catalogToInsert(book, { location, notes }));
        setStatus(`"${book.title}" kütüphaneye eklendi.`);
        setError(null);
        setResults((current) =>
          current.map((item) =>
            item === book ? { ...item, alreadyOwned: true } : item,
          ),
        );
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Ekleme başarısız.";
        if (message.includes("duplicate") || message.includes("unique")) {
          setError("Bu ISBN zaten kayıtlı.");
        } else {
          setError(message);
        }
      }
    });
  }

  async function checkManualDuplicate() {
    const library = await listBooks();
    const matches = findSimilarBooks(
      {
        title: manual.title,
        authors: manual.authors
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      },
      library,
    );
    if (matches[0]) {
      setManualWarning(
        `Benzer kitap: "${matches[0].book.title}". Yine de kaydetmek için tekrar gönder.`,
      );
      return true;
    }
    setManualWarning(null);
    return false;
  }

  function saveManual(event: FormEvent) {
    event.preventDefault();
    if (!manual.title.trim()) {
      setError("Başlık zorunlu.");
      return;
    }

    startTransition(async () => {
      try {
        if (!forceManual) {
          const hasDuplicate = await checkManualDuplicate();
          if (hasDuplicate) {
            setForceManual(true);
            return;
          }
        }

        await addBook({
          title: manual.title,
          authors: manual.authors
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean),
          isbn: manual.isbn || null,
          isbn13: manual.isbn13 || null,
          publisher: manual.publisher || null,
          published_date: manual.published_date || null,
          page_count: manual.page_count ? Number(manual.page_count) : null,
          location: manual.location || location || null,
          notes: manual.notes || notes || null,
          description: manual.description || null,
          cover_url: manual.cover_url || null,
          source: "manual",
        });
        setStatus(`"${manual.title}" elle eklendi.`);
        setError(null);
        setManualWarning(null);
        setForceManual(false);
        setManual(emptyManual);
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Ekleme başarısız.";
        if (message.includes("duplicate") || message.includes("unique")) {
          setError("Bu ISBN zaten kayıtlı.");
        } else {
          setError(message);
        }
      }
    });
  }

  return (
    <section className="stack-lg">
      <div className="page-copy">
        <h1 className="page-title">
          Kitap ara
          <br />
          veya elle ekle
        </h1>
        <p className="page-lead">
          Open Library ve Google Books üzerinden ISBN veya isimle ara. Barkod
          tara veya toplu ISBN yapıştır.
        </p>
      </div>

      <form onSubmit={runSearch} className="panel panel-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ISBN veya kitap adı (yazarken arar)..."
          className="input input-muted"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={searching || query.trim().length < 2}
          className="btn btn-primary"
        >
          {searching ? "Aranıyor..." : "Katalogda ara"}
        </button>
      </form>

      <BarcodeScanner onScan={handleScan} />

      <div className="field-grid">
        <label className="field">
          <span className="field-label">Yer (raf / oda)</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Örnek: Salon sol raf"
            className="input"
          />
        </label>
        <label className="field">
          <span className="field-label">Not</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Örnek: Hediye / ikinci el"
            className="input"
          />
        </label>
      </div>

      {status ? <p className="alert alert-ok">{status}</p> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}

      {results.length > 0 ? (
        <div className="stack-md">
          <h2 className="section-title">Arama sonuçları</h2>
          <div className="result-list">
            {results.map((book, index) => (
              <article
                key={`${book.source}-${book.isbn13 || book.isbn || book.title}-${index}`}
                className="result-card"
              >
                <div className="result-cover">
                  <BookCover title={book.title} coverUrl={book.cover_url} />
                </div>
                <div className="stack-sm">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-meta">
                    {book.authors.length
                      ? book.authors.join(", ")
                      : "Yazar bilinmiyor"}
                  </p>
                  <div className="chip-row">
                    <span className="chip">
                      {book.source === "open_library"
                        ? "Open Library"
                        : "Google Books"}
                    </span>
                    {book.isbn13 || book.isbn ? (
                      <span className="chip chip-mono">
                        {book.isbn13 || book.isbn}
                      </span>
                    ) : null}
                    {book.alreadyOwned ? (
                      <span className="chip chip-warn">Evde var</span>
                    ) : null}
                    {book.possibleDuplicate ? (
                      <span className="chip chip-warn">
                        Benzer: {book.duplicateOfTitle}
                      </span>
                    ) : null}
                  </div>
                  {book.description ? (
                    <p className="clamp-3">{book.description}</p>
                  ) : null}
                </div>
                <div>
                  <button
                    type="button"
                    disabled={pending || book.alreadyOwned}
                    onClick={() => saveCatalogBook(book)}
                    className="btn btn-primary"
                  >
                    {book.alreadyOwned
                      ? "Zaten var"
                      : book.possibleDuplicate
                        ? "Yine de ekle"
                        : "Kütüphaneye ekle"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <BulkIsbnAdd location={location} notes={notes} />

      <div className="stack-md">
        <div className="section-head">
          <h2 className="section-title">Manuel ekleme</h2>
          <button
            type="button"
            onClick={() => setShowManual((value) => !value)}
            className="btn btn-ghost"
          >
            {showManual ? "Formu gizle" : "Formu aç"}
          </button>
        </div>

        {showManual ? (
          <form onSubmit={saveManual} className="panel field-grid">
            <label className="field field-span-2">
              <span className="field-label">Başlık *</span>
              <input
                required
                value={manual.title}
                onChange={(event) => {
                  setForceManual(false);
                  setManualWarning(null);
                  setManual((current) => ({
                    ...current,
                    title: event.target.value,
                  }));
                }}
                className="input input-muted"
              />
            </label>
            <label className="field field-span-2">
              <span className="field-label">Yazarlar (virgül ile)</span>
              <input
                value={manual.authors}
                onChange={(event) => {
                  setForceManual(false);
                  setManualWarning(null);
                  setManual((current) => ({
                    ...current,
                    authors: event.target.value,
                  }));
                }}
                className="input input-muted"
              />
            </label>
            <label className="field">
              <span className="field-label">ISBN-10</span>
              <input
                value={manual.isbn}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    isbn: event.target.value,
                  }))
                }
                className="input input-muted"
              />
            </label>
            <label className="field">
              <span className="field-label">ISBN-13</span>
              <input
                value={manual.isbn13}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    isbn13: event.target.value,
                  }))
                }
                className="input input-muted"
              />
            </label>
            <label className="field">
              <span className="field-label">Yayınevi</span>
              <input
                value={manual.publisher}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    publisher: event.target.value,
                  }))
                }
                className="input input-muted"
              />
            </label>
            <label className="field">
              <span className="field-label">Yayın tarihi</span>
              <input
                value={manual.published_date}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    published_date: event.target.value,
                  }))
                }
                className="input input-muted"
              />
            </label>
            <label className="field">
              <span className="field-label">Sayfa</span>
              <input
                type="number"
                min={1}
                value={manual.page_count}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    page_count: event.target.value,
                  }))
                }
                className="input input-muted"
              />
            </label>
            <label className="field">
              <span className="field-label">Yer</span>
              <input
                value={manual.location}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                className="input input-muted"
              />
            </label>
            <label className="field field-span-2">
              <span className="field-label">Kapak URL</span>
              <input
                value={manual.cover_url}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    cover_url: event.target.value,
                  }))
                }
                className="input input-muted"
              />
            </label>
            <label className="field field-span-2">
              <span className="field-label">Açıklama</span>
              <textarea
                value={manual.description}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="textarea input-muted"
              />
            </label>
            <label className="field field-span-2">
              <span className="field-label">Not</span>
              <textarea
                value={manual.notes}
                onChange={(event) =>
                  setManual((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={2}
                className="textarea input-muted"
              />
            </label>
            {manualWarning ? (
              <p className="alert alert-error field-span-2">{manualWarning}</p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary field-span-2"
            >
              {pending
                ? "Kaydediliyor..."
                : forceManual
                  ? "Yine de kaydet"
                  : "Elle kaydet"}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
