"use client";

import Link from "next/link";
import { computeStats } from "@/lib/books";
import type { Book } from "@/lib/types";
import { READING_STATUS_LABELS } from "@/lib/types";

type StatsPanelProps = {
  books: Book[];
};

export function StatsPanel({ books }: StatsPanelProps) {
  const stats = computeStats(books);
  const maxAuthor = Math.max(...stats.byAuthor.map((row) => row.count), 1);
  const maxLocation = Math.max(
    ...stats.byLocation.map((row) => row.count),
    1,
  );

  return (
    <section className="stack-lg">
      <div className="page-copy">
        <h1 className="page-title">İstatistikler</h1>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <strong>{stats.total}</strong>
          <span>Toplam kitap</span>
        </article>
        <article className="stat-card">
          <strong>{stats.byStatus.reading}</strong>
          <span>Okunuyor</span>
        </article>
        <article className="stat-card">
          <strong>{stats.loanedCount}</strong>
          <span>Ödünçte</span>
        </article>
        <article className="stat-card">
          <strong>{stats.overdueCount}</strong>
          <span>Gecikmiş</span>
        </article>
      </div>

      <div className="split-panels">
        <section className="panel stack-md">
          <h2 className="section-title">Okuma durumu</h2>
          <ul className="bar-list">
            {(
              Object.keys(READING_STATUS_LABELS) as Array<
                keyof typeof READING_STATUS_LABELS
              >
            ).map((status) => (
              <li key={status}>
                <div className="bar-label">
                  <span>{READING_STATUS_LABELS[status]}</span>
                  <span>{stats.byStatus[status]}</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${stats.total ? (stats.byStatus[status] / stats.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel stack-md">
          <h2 className="section-title">Rafa göre</h2>
          <ul className="bar-list">
            {stats.byLocation.map((row) => (
              <li key={row.location}>
                <div className="bar-label">
                  <span>{row.location}</span>
                  <span>{row.count}</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(row.count / maxLocation) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="split-panels">
        <section className="panel stack-md">
          <h2 className="section-title">Yazarlar</h2>
          <ul className="bar-list">
            {stats.byAuthor.map((row) => (
              <li key={row.author}>
                <div className="bar-label">
                  <span>{row.author}</span>
                  <span>{row.count}</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(row.count / maxAuthor) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel stack-md">
          <h2 className="section-title">Son eklenenler</h2>
          <ul className="simple-list">
            {stats.recentlyAdded.map((book) => (
              <li key={book.id}>
                <Link href={`/kitap/${book.id}`}>{book.title}</Link>
                <span className="muted-note">
                  {new Date(book.created_at).toLocaleDateString("tr-TR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
