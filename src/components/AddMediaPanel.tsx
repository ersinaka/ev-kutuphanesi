"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MediaPoster } from "@/components/MediaPoster";
import {
  addMedia,
  getMyMediaKeys,
  isDuplicateMediaError,
  mediaKey,
  searchMedia,
} from "@/lib/media";
import {
  MEDIA_TYPE_LABELS,
  WATCH_STATUS_LABELS,
  type MediaSearchResult,
  type MediaType,
  type WatchStatus,
} from "@/lib/types";

const DEBOUNCE_MS = 350;

function formatDate(value: string | null) {
  if (!value) return "Tarih belirtilmemiş";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function AddMediaPanel({ type }: { type: MediaType }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<MediaSearchResult | null>(null);
  const [watchStatus, setWatchStatus] = useState<WatchStatus>("planned");
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef("");

  useEffect(() => {
    let active = true;
    void getMyMediaKeys()
      .then((keys) => {
        if (active) setOwned(keys);
      })
      .catch(() => {
        // Ownership marks from the API still cover the initial results.
      });
    return () => {
      active = false;
    };
  }, [type]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const decorate = useCallback(
    (items: MediaSearchResult[]) =>
      items.map((item) => ({
        ...item,
        alreadyOwned:
          item.alreadyOwned || owned.has(mediaKey(item.type, item.tmdb_id)),
      })),
    [owned],
  );

  const runSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const requestId = ++requestIdRef.current;
      lastSearchedRef.current = trimmed;

      setQuery(trimmed);
      setSearched(true);
      setError(null);
      setStatus(null);
      setSelected(null);
      setSearching(true);

      try {
        const items = await searchMedia(trimmed, type, controller.signal);
        if (requestId !== requestIdRef.current) return;
        setResults(decorate(items));
        setStatus(
          items.length
            ? `${items.length} sonuç bulundu.`
            : "Sonuç bulunamadı. Farklı bir arama dene.",
        );
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setResults([]);
        setError(
          err instanceof Error ? err.message : "Arama şu anda kullanılamıyor.",
        );
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    },
    [decorate, type],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 3 || trimmed === lastSearchedRef.current) return;

    debounceRef.current = setTimeout(() => {
      void runSearch(trimmed);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void runSearch(query);
  }

  function handleSelect(result: MediaSearchResult) {
    if (result.alreadyOwned) {
      setError(`Bu ${MEDIA_TYPE_LABELS[result.type].toLocaleLowerCase("tr")} zaten listende.`);
      return;
    }
    setSelected(result);
    setWatchStatus("planned");
    setRating(null);
    setReview("");
    setError(null);
    setStatus(null);
  }

  async function handleSave() {
    if (!selected) return;
    if (selected.alreadyOwned || owned.has(mediaKey(selected.type, selected.tmdb_id))) {
      setError("Bu kayıt zaten listende.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addMedia({
        content_type: selected.type,
        tmdb_id: selected.tmdb_id,
        title: selected.title,
        original_title: selected.original_title,
        release_date: selected.release_date,
        overview: selected.overview,
        poster_path: selected.poster_path,
        backdrop_path: selected.backdrop_path,
        original_language: selected.original_language,
        vote_average: selected.vote_average,
        genre_ids: selected.genre_ids,
        metadata: {
          source: "tmdb",
          adult: selected.adult,
          fetched_at: new Date().toISOString(),
        },
        watch_status: watchStatus,
        rating,
        review: review.trim() || null,
      });

      const key = mediaKey(selected.type, selected.tmdb_id);
      setOwned((current) => new Set(current).add(key));
      setResults((current) =>
        current.map((item) =>
          item.tmdb_id === selected.tmdb_id && item.type === selected.type
            ? { ...item, alreadyOwned: true }
            : item,
        ),
      );
      setStatus(`"${selected.title}" listene eklendi.`);
      setSelected(null);
      setRating(null);
      setReview("");
    } catch (err) {
      setError(
        isDuplicateMediaError(err)
          ? "Bu kayıt zaten listende."
          : err instanceof Error
            ? err.message
            : "Kaydetme başarısız.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-copy">
        <p className="eyebrow">TMDB</p>
        <h1 className="page-title">
          {type === "movie" ? "Film ara" : "Dizi ara"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="panel panel-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            type === "movie"
              ? "Film adı (yazarken arar)..."
              : "Dizi adı (yazarken arar)..."
          }
          className="input input-muted"
          autoComplete="off"
          aria-label={`${MEDIA_TYPE_LABELS[type]} adı`}
        />
        <button
          type="submit"
          disabled={searching || query.trim().length < 2}
          className="btn btn-primary"
        >
          {searching ? "Aranıyor..." : "TMDB'de ara"}
        </button>
      </form>

      {status && <p className="alert alert-ok">{status}</p>}
      {error && <p className="alert alert-error">{error}</p>}
      {searching && (
        <p className="media-loading" role="status">
          <span className="media-spinner" aria-hidden /> Sonuçlar getiriliyor...
        </p>
      )}

      {!searching && searched && !results.length && !error && (
        <div className="empty-state">
          <h2>Sonuç yok</h2>
          <p>Farklı bir yazım dene veya aramayı biraz daha genel tut.</p>
        </div>
      )}

      {results.length > 0 && (
        <section className="stack-md">
          <h2 className="section-title">Sonuçlar</h2>
          <div className="media-results">
            {results.map((result) => (
              <article key={result.tmdb_id} className="media-result">
                <MediaPoster
                  title={result.title}
                  path={result.poster_path}
                  size="w342"
                  className="media-poster"
                />
                <div className="media-result-body">
                  <h3 className="media-result-title">{result.title}</h3>
                  {result.original_title && result.original_title !== result.title && (
                    <p className="media-original">{result.original_title}</p>
                  )}
                  <p className="media-meta">
                    <span>{MEDIA_TYPE_LABELS[result.type]}</span>
                    <span>{formatDate(result.release_date)}</span>
                    {result.vote_average != null && (
                      <span>TMDB ★ {result.vote_average.toFixed(1)}</span>
                    )}
                  </p>
                  <p className="clamp-3">
                    {result.overview || "Açıklama bulunmuyor."}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelect(result)}
                    disabled={result.alreadyOwned}
                    className={`btn btn-sm ${
                      result.alreadyOwned ? "btn-ghost" : "btn-primary"
                    }`}
                  >
                    {result.alreadyOwned ? "Zaten eklendi" : "Seç ve ekle"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <section className="panel panel-wood media-detail">
          <div className="media-detail-head">
            <MediaPoster
              title={selected.title}
              path={selected.poster_path}
              size="w342"
              className="media-poster media-poster-detail"
            />
            <div className="stack-sm">
              <h2 className="section-title">{selected.title}</h2>
              {selected.original_title && (
                <p className="media-original">{selected.original_title}</p>
              )}
              <p className="media-meta">
                <span>{MEDIA_TYPE_LABELS[selected.type]}</span>
                <span>{formatDate(selected.release_date)}</span>
                {selected.vote_average != null && (
                  <span>TMDB ★ {selected.vote_average.toFixed(1)}</span>
                )}
              </p>
              <p className="media-overview">
                {selected.overview || "Açıklama bulunmuyor."}
              </p>
              <p className="muted-note">TMDB ID: {selected.tmdb_id}</p>
            </div>
          </div>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">İzleme durumu</span>
              <select
                className="input"
                value={watchStatus}
                onChange={(event) =>
                  setWatchStatus(event.target.value as WatchStatus)
                }
              >
                {(Object.keys(WATCH_STATUS_LABELS) as WatchStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {WATCH_STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Puanın (isteğe bağlı)</span>
              <div className="media-rating" role="group" aria-label="Puan">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} yıldız`}
                    aria-pressed={rating === value}
                    className={`media-star${rating === value ? " is-active" : ""}`}
                    onClick={() => setRating(rating === value ? null : value)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </label>
            <label className="field field-span-2">
              <span className="field-label">Notun (isteğe bağlı)</span>
              <textarea
                className="textarea"
                value={review}
                maxLength={2000}
                onChange={(event) => setReview(event.target.value)}
                placeholder="Bu yapıt hakkında kısa bir not..."
              />
            </label>
          </div>

          <div className="action-row">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? "Kaydediliyor..." : "Listeme ekle"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              disabled={saving}
              className="btn btn-ghost"
            >
              Vazgeç
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
