"use client";

import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { looksLikeIsbn, normalizeIsbn } from "@/lib/isbn";

type BarcodeScannerProps = {
  onScan: (isbn: string) => void;
};

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const scanner = new Html5Qrcode(regionId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.CODE_128,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;

    async function start() {
      setStarting(true);
      setError(null);
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 260, height: 140 } },
          (decoded) => {
            const isbn = normalizeIsbn(decoded);
            if (!isbn || !looksLikeIsbn(isbn)) return;
            void scanner.stop().catch(() => undefined);
            scannerRef.current = null;
            setOpen(false);
            onScan(isbn);
          },
          () => undefined,
        );
      } catch {
        if (!cancelled) {
          setError("Kamera açılamadı. Tarayıcı iznini kontrol et.");
          setOpen(false);
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void start();

    return () => {
      cancelled = true;
      void scanner
        .stop()
        .catch(() => undefined)
        .finally(() => {
          scanner.clear();
          scannerRef.current = null;
        });
    };
  }, [open, onScan, regionId]);

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Kamerayı kapat" : "Barkod tara"}
      </button>

      {error ? <p className="alert alert-error">{error}</p> : null}
      {starting ? <p className="muted-note">Kamera hazırlanıyor...</p> : null}

      {open ? (
        <div className="scanner-shell">
          <div id={regionId} className="scanner-viewport" />
          <p className="muted-note">ISBN barkodunu çerçeveye hizala.</p>
        </div>
      ) : null}
    </div>
  );
}
