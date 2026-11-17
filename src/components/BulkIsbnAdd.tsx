"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  addBook,
  catalogToInsert,
  findOwnedMatches,
  markOwned,
} from "@/lib/books";
import { looksLikeIsbn, normalizeIsbn } from "@/lib/isbn";
import type { CatalogBook } from "@/lib/types";

type BulkRow = {
  isbn: string;
  status: "pending" | "added" | "owned" | "missing" | "error";
  title?: string;
  message?: string;
};

function parseIsbns(raw: string) {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const unique = new Map<string, string>();
  for (const part of parts) {
    if (!looksLikeIsbn(part)) continue;
    const isbn = normalizeIsbn(part);
    if (isbn) unique.set(isbn, isbn);
  }
  return Array.from(unique.values());
}

export function BulkIsbnAdd({
  location,
  notes,
}: {
  location: string;
  notes: string;
}) {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(event: FormEvent) {
    event.preventDefault();
    const isbns = parseIsbns(raw);
    if (!isbns.length) {
      setError("Geçerli ISBN bulunamadı.");
      setRows([]);
      return;
    }

    setError(null);
    setRows(isbns.map((isbn) => ({ isbn, status: "pending" })));

    startTransition(async () => {
      const nextRows: BulkRow[] = [];

      for (const isbn of isbns) {
        try {
          const response = await fetch(
            `/api/catalog/search?q=${encodeURIComponent(isbn)}`,
          );
          const data = (await response.json()) as {
            results?: CatalogBook[];
            error?: string;
          };

          if (!response.ok) {
            nextRows.push({
              isbn,
              status: "error",
              message: data.error || "Arama başarısız",
            });
            setRows([...nextRows, ...isbns.slice(nextRows.length).map((value) => ({
              isbn: value,
              status: "pending" as const,
            }))]);
            continue;
          }

          const catalog = data.results ?? [];
          const owned = await findOwnedMatches(catalog);
          const withOwned = markOwned(catalog, owned);
          const match =
            withOwned.find((book) => book.isbn13 === isbn || book.isbn === isbn) ??
            withOwned[0];

          if (!match) {
            nextRows.push({
              isbn,
              status: "missing",
              message: "Katalogda yok",
            });
          } else if (match.alreadyOwned) {
            nextRows.push({
              isbn,
              status: "owned",
              title: match.title,
              message: "Evde var",
            });
          } else {
            await addBook(catalogToInsert(match, { location, notes }));
            nextRows.push({
              isbn,
              status: "added",
              title: match.title,
              message: "Eklendi",
            });
          }
        } catch (err) {
          nextRows.push({
            isbn,
            status: "error",
            message:
              err instanceof Error ? err.message : "Beklenmeyen hata",
          });
        }

        setRows([
          ...nextRows,
          ...isbns.slice(nextRows.length).map((value) => ({
            isbn: value,
            status: "pending" as const,
          })),
        ]);
      }
    });
  }

  return (
    <section className="stack-md">
      <div className="section-head">
        <h2 className="section-title">Toplu ISBN ekle</h2>
      </div>
      <p className="page-lead">
        Birden fazla ISBN yapıştır (satır, virgül veya boşlukla).
      </p>

      <form onSubmit={run} className="panel stack-md">
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={5}
          placeholder={"9786053606208\n9789750719383\n9750802982"}
          className="textarea input-muted"
        />
        <button
          type="submit"
          disabled={pending || raw.trim().length < 10}
          className="btn btn-primary"
        >
          {pending ? "İşleniyor..." : "Toplu ekle"}
        </button>
      </form>

      {error ? <p className="alert alert-error">{error}</p> : null}

      {rows.length > 0 ? (
        <ul className="bulk-list">
          {rows.map((row) => (
            <li key={row.isbn} className={`bulk-item status-${row.status}`}>
              <span className="chip chip-mono">{row.isbn}</span>
              <span>{row.title || "—"}</span>
              <span className="bulk-status">{row.message || "Bekliyor"}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
