"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { addBooksBulk } from "@/lib/books";
import {
  booksToCsv,
  booksToJson,
  downloadTextFile,
  parseImportCsv,
  parseImportJson,
} from "@/lib/export";
import type { Book } from "@/lib/types";

type ImportExportPanelProps = {
  books: Book[];
};

export function ImportExportPanel({ books }: ImportExportPanelProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function exportJson() {
    downloadTextFile(
      `ev-kutuphanesi-${new Date().toISOString().slice(0, 10)}.json`,
      booksToJson(books),
      "application/json",
    );
    setStatus("JSON indirildi.");
  }

  function exportCsv() {
    downloadTextFile(
      `ev-kutuphanesi-${new Date().toISOString().slice(0, 10)}.csv`,
      booksToCsv(books),
      "text/csv;charset=utf-8",
    );
    setStatus("CSV indirildi.");
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const text = await file.text();
        const isJson =
          file.name.toLowerCase().endsWith(".json") ||
          text.trim().startsWith("[") ||
          text.trim().startsWith("{");

        const rows = isJson ? parseImportJson(text) : parseImportCsv(text);
        if (!rows.length) {
          setError("Dosyada eklenecek kitap bulunamadı.");
          setStatus(null);
          return;
        }

        const result = await addBooksBulk(rows);
        setStatus(
          `${result.ok.length} kitap eklendi` +
            (result.failed.length
              ? `, ${result.failed.length} atlandı (muhtemel çift ISBN).`
              : "."),
        );
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "İçe aktarma başarısız.",
        );
        setStatus(null);
      } finally {
        event.target.value = "";
      }
    });
  }

  return (
    <section className="stack-lg">
      <div className="page-copy">
        <h1 className="page-title">Yedekle / aktar</h1>
        <p className="page-lead">
          Kütüphaneyi CSV veya JSON olarak dışa aktar, ya da dosyadan içe al.
        </p>
      </div>

      <div className="split-panels">
        <section className="panel stack-md">
          <h2 className="section-title">Dışa aktar</h2>
          <p className="muted-note">{books.length} kitap hazır.</p>
          <div className="action-row">
            <button type="button" className="btn btn-primary" onClick={exportJson}>
              JSON indir
            </button>
            <button type="button" className="btn btn-ghost" onClick={exportCsv}>
              CSV indir
            </button>
          </div>
        </section>

        <section className="panel stack-md">
          <h2 className="section-title">İçe aktar</h2>
          <p className="muted-note">
            Aynı ISBN varsa atlanır. JSON veya CSV yükle.
          </p>
          <label className="file-button">
            <span className="btn btn-primary">
              {pending ? "Yükleniyor..." : "Dosya seç"}
            </span>
            <input
              type="file"
              accept=".json,.csv,text/csv,application/json"
              disabled={pending}
              onChange={onFile}
              hidden
            />
          </label>
        </section>
      </div>

      {status ? <p className="alert alert-ok">{status}</p> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
    </section>
  );
}
