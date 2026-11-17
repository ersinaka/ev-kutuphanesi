"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updateBook } from "@/lib/books";
import type { Book } from "@/lib/types";

type LoanPanelProps = {
  book: Book;
  onUpdated: (book: Book) => void;
};

export function LoanPanel({ book, onUpdated }: LoanPanelProps) {
  const [loanedTo, setLoanedTo] = useState(book.loaned_to ?? "");
  const [loanedAt, setLoanedAt] = useState(
    book.loaned_at ?? new Date().toISOString().slice(0, 10),
  );
  const [dueAt, setDueAt] = useState(book.due_at ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveLoan(event: FormEvent) {
    event.preventDefault();
    if (!loanedTo.trim()) {
      setError("Kime verildiğini yaz.");
      return;
    }

    startTransition(async () => {
      try {
        const updated = await updateBook(book.id, {
          loaned_to: loanedTo.trim(),
          loaned_at: loanedAt || null,
          due_at: dueAt || null,
        });
        onUpdated(updated);
        setMessage("Ödünç kaydı güncellendi.");
        setError(null);
      } catch {
        setError("Ödünç kaydı kaydedilemedi.");
      }
    });
  }

  function clearLoan() {
    startTransition(async () => {
      try {
        const updated = await updateBook(book.id, {
          loaned_to: null,
          loaned_at: null,
          due_at: null,
        });
        onUpdated(updated);
        setLoanedTo("");
        setDueAt("");
        setMessage("Kitap geri alındı.");
        setError(null);
      } catch {
        setError("İade kaydı başarısız.");
      }
    });
  }

  return (
    <section className="panel stack-md">
      <h2 className="section-title">Ödünç takibi</h2>
      <p className="muted-note">
        Üyelik yok: isim olarak istediğini yaz (ör. Ayşe, komşu).
      </p>

      <form onSubmit={saveLoan} className="field-grid">
        <label className="field">
          <span className="field-label">Kimde</span>
          <input
            value={loanedTo}
            onChange={(event) => setLoanedTo(event.target.value)}
            placeholder="Örnek: Ayşe"
            className="input input-muted"
          />
        </label>
        <label className="field">
          <span className="field-label">Veriliş</span>
          <input
            type="date"
            value={loanedAt}
            onChange={(event) => setLoanedAt(event.target.value)}
            className="input input-muted"
          />
        </label>
        <label className="field field-span-2">
          <span className="field-label">Dönüş tarihi</span>
          <input
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="input input-muted"
          />
        </label>
        <div className="action-row field-span-2">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Kaydediliyor..." : "Ödünç kaydet"}
          </button>
          {book.loaned_to ? (
            <button
              type="button"
              disabled={pending}
              onClick={clearLoan}
              className="btn btn-ghost"
            >
              Geri alındı
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="alert alert-ok">{message}</p> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
    </section>
  );
}
