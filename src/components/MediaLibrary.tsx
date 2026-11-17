"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MediaPoster } from "@/components/MediaPoster";
import { deleteMedia, updateMedia } from "@/lib/media";
import {
  MEDIA_TYPE_LABELS,
  WATCH_STATUS_LABELS,
  type MediaItem,
  type MediaType,
  type WatchStatus,
} from "@/lib/types";

type TypeFilter = MediaType | "all";
type StatusFilter = WatchStatus | "all";

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

export function MediaLibrary({ initialItems }: { initialItems: MediaItem[] }) {
  const [items, setItems] = useState<MediaItem[]>(initialItems);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    return items.filter((item) => {
      if (typeFilter !== "all" && item.content_type !== typeFilter) return false;
      if (statusFilter !== "all" && item.watch_status !== statusFilter) return false;
      if (!term) return true;
      return (
        item.title.toLocaleLowerCase("tr").includes(term) ||
        (item.original_title ?? "").toLocaleLowerCase("tr").includes(term)
      );
    });
  }, [items, search, statusFilter, typeFilter]);

  const counts = useMemo(() => {
    const base = { all: items.length, movie: 0, tv: 0 };
    for (const item of items) base[item.content_type] += 1;
    return base;
  }, [items]);

  async function changeStatus(item: MediaItem, watchStatus: WatchStatus) {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateMedia(item.id, { watch_status: watchStatus });
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? updated : entry)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  }

  async function changeRating(item: MediaItem, rating: number | null) {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateMedia(item.id, { rating });
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? updated : entry)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Puan güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: MediaItem) {
    setBusyId(item.id);
    setError(null);
    try {
      await deleteMedia(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-copy media-page-head">
        <div>
          <p className="eyebrow">Koleksiyon</p>
          <h1 className="page-title">Film ve dizilerim</h1>
        </div>
        <Link href="/ekle" className="btn btn-primary">
          + Yeni ekle
        </Link>
      </div>

      <div className="stat-row">
        <span className="stat-chip">
          <strong>{counts.all}</strong> kayıt
        </span>
        <span className="stat-chip">
          <strong>{counts.movie}</strong> film
        </span>
        <span className="stat-chip">
          <strong>{counts.tv}</strong> dizi
        </span>
      </div>

      <div className="panel media-filters">
        <input
          className="input input-muted"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Film veya dizi ara..."
          aria-label="Medya ara"
        />
        <div className="view-toggle">
          {(["all", "movie", "tv"] as TypeFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTypeFilter(key)}
              className={`btn btn-sm btn-ghost${typeFilter === key ? " is-active" : ""}`}
              aria-pressed={typeFilter === key}
            >
              {key === "all" ? "Tümü" : MEDIA_TYPE_LABELS[key]}
            </button>
          ))}
        </div>
        <select
          className="input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          aria-label="İzleme durumuna göre filtrele"
        >
          <option value="all">Tüm durumlar</option>
          {(Object.keys(WATCH_STATUS_LABELS) as WatchStatus[]).map((key) => (
            <option key={key} value={key}>
              {WATCH_STATUS_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h2>{items.length ? "Eşleşen kayıt yok" : "Liste henüz boş"}</h2>
          <p>
            {items.length
              ? "Filtreleri değiştirmeyi dene."
              : "TMDB'den film veya dizi arayıp listene ekleyebilirsin."}
          </p>
          {!items.length && (
            <Link href="/ekle?type=movie" className="btn btn-primary media-empty-action">
              Film eklemeye başla
            </Link>
          )}
        </div>
      ) : (
        <div className="media-library-grid">
          {filtered.map((item) => (
            <article key={item.id} className="media-library-card">
              <div className="media-library-poster">
                <MediaPoster
                  title={item.title}
                  path={item.poster_path}
                  size="w342"
                  className="media-poster"
                />
                <span className="media-type-badge">
                  {MEDIA_TYPE_LABELS[item.content_type]}
                </span>
              </div>
              <div className="media-library-body">
                <h2 className="media-library-title">{item.title}</h2>
                {item.original_title && item.original_title !== item.title && (
                  <p className="media-original">{item.original_title}</p>
                )}
                <p className="media-meta">
                  <span>{formatDate(item.release_date)}</span>
                  {item.vote_average != null && (
                    <span>TMDB ★ {item.vote_average.toFixed(1)}</span>
                  )}
                </p>
                {item.overview && <p className="clamp-3">{item.overview}</p>}

                <label className="field">
                  <span className="field-label">Durum</span>
                  <select
                    className="input"
                    value={item.watch_status}
                    disabled={busyId === item.id}
                    onChange={(event) =>
                      void changeStatus(item, event.target.value as WatchStatus)
                    }
                  >
                    {(Object.keys(WATCH_STATUS_LABELS) as WatchStatus[]).map((key) => (
                      <option key={key} value={key}>
                        {WATCH_STATUS_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="media-rating" role="group" aria-label="Puan">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={busyId === item.id}
                      aria-label={`${value} yıldız`}
                      aria-pressed={item.rating === value}
                      className={`media-star${item.rating === value ? " is-active" : ""}`}
                      onClick={() =>
                        void changeRating(item, item.rating === value ? null : value)
                      }
                    >
                      ★
                    </button>
                  ))}
                </div>

                {item.review && <p className="media-note">“{item.review}”</p>}

                {confirmId === item.id ? (
                  <div className="action-row">
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={busyId === item.id}
                      onClick={() => void remove(item)}
                    >
                      Evet, sil
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setConfirmId(null)}
                    >
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setConfirmId(item.id)}
                  >
                    Sil
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="muted-note">Posterler TMDb&apos;den alınır.</p>
    </div>
  );
}
