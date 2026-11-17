function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 1),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function titleAuthorSimilarity(
  left: { title: string; authors: string[] },
  right: { title: string; authors: string[] },
) {
  const titleScore = jaccard(tokens(left.title), tokens(right.title));
  const authorScore = jaccard(
    tokens(left.authors.join(" ")),
    tokens(right.authors.join(" ")),
  );

  if (normalizeText(left.title) === normalizeText(right.title)) {
    return Math.max(0.85, (titleScore + authorScore) / 2);
  }

  return titleScore * 0.7 + authorScore * 0.3;
}

export function findSimilarBooks<T extends { title: string; authors: string[] }>(
  candidate: { title: string; authors: string[] },
  library: T[],
  threshold = 0.72,
) {
  return library
    .map((book) => ({
      book,
      score: titleAuthorSimilarity(candidate, book),
    }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
