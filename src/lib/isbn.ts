export function normalizeIsbn(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (cleaned.length === 10 || cleaned.length === 13) return cleaned;
  return null;
}

export function looksLikeIsbn(query: string): boolean {
  const cleaned = query.replace(/[^0-9Xx]/g, "");
  return cleaned.length === 10 || cleaned.length === 13;
}

export function isbn10To13(isbn10: string): string | null {
  const normalized = normalizeIsbn(isbn10);
  if (!normalized || normalized.length !== 10) return null;

  const body = `978${normalized.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const digit = Number(body[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${body}${check}`;
}

export function preferredIsbn(isbn: string | null, isbn13: string | null) {
  return isbn13 || isbn || null;
}
