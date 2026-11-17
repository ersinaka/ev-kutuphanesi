import "server-only";

import type { MediaSearchResult, MediaType } from "@/lib/types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const CACHE_TTL_MS = 1000 * 60 * 10;
const TIMEOUT_MS = 8000;

type CacheEntry = {
  expires: number;
  results: MediaSearchResult[];
};

const memory = new Map<string, CacheEntry>();

export type TmdbErrorKind =
  | "missing_key"
  | "timeout"
  | "bad_response"
  | "upstream";

export class TmdbError extends Error {
  constructor(
    public readonly kind: TmdbErrorKind,
    message: string,
  ) {
    super(message);
  }
}

type TmdbRawItem = {
  id?: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  original_language?: string;
  vote_average?: number;
  genre_ids?: number[];
  adult?: boolean;
};

function normalize(item: TmdbRawItem, type: MediaType): MediaSearchResult | null {
  const tmdbId = Number(item.id);
  const title = (type === "movie" ? item.title : item.name)?.trim();

  if (!Number.isFinite(tmdbId) || tmdbId <= 0 || !title) return null;

  return {
    tmdb_id: tmdbId,
    type,
    title,
    original_title:
      (type === "movie" ? item.original_title : item.original_name)?.trim() || null,
    release_date:
      (type === "movie" ? item.release_date : item.first_air_date) || null,
    overview: item.overview?.trim() || null,
    poster_path: item.poster_path || null,
    backdrop_path: item.backdrop_path || null,
    original_language: item.original_language || null,
    vote_average:
      typeof item.vote_average === "number" && Number.isFinite(item.vote_average)
        ? Math.round(item.vote_average * 10) / 10
        : null,
    genre_ids: Array.isArray(item.genre_ids)
      ? item.genre_ids.filter((id) => Number.isFinite(Number(id))).map(Number)
      : [],
    adult: Boolean(item.adult),
  };
}

function cleanExpired() {
  if (memory.size < 200) return;
  const now = Date.now();
  for (const [key, entry] of memory) {
    if (entry.expires < now) memory.delete(key);
  }
}

export async function searchTmdb(
  query: string,
  type: MediaType,
): Promise<MediaSearchResult[]> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    throw new TmdbError("missing_key", "TMDB_API_KEY tanımlı değil.");
  }

  const cacheKey = `${type}:${query.toLocaleLowerCase("tr")}`;
  const hit = memory.get(cacheKey);
  if (hit && hit.expires >= Date.now()) return hit.results;
  if (hit) memory.delete(cacheKey);

  const isV4 = key.includes(".");
  const endpoint = type === "movie" ? "search/movie" : "search/tv";
  const url = new URL(`${TMDB_BASE}/${endpoint}`);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "tr-TR");
  url.searchParams.set("page", "1");
  url.searchParams.set("include_adult", "false");
  if (!isV4) url.searchParams.set("api_key", key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let payload: unknown;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(isV4 ? { Authorization: `Bearer ${key}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new TmdbError("upstream", `TMDB ${response.status} döndürdü.`);
    }

    payload = await response.json();
  } catch (error) {
    if (error instanceof TmdbError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TmdbError("timeout", "TMDB yanıt vermedi.");
    }
    throw new TmdbError("upstream", "TMDB'ye ulaşılamadı.");
  } finally {
    clearTimeout(timeout);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { results?: unknown }).results)
  ) {
    throw new TmdbError("bad_response", "TMDB beklenmeyen bir yanıt döndürdü.");
  }

  const results = ((payload as { results: TmdbRawItem[] }).results)
    .map((item) => normalize(item, type))
    .filter((item): item is MediaSearchResult => item !== null)
    .slice(0, 20);

  cleanExpired();
  memory.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, results });
  return results;
}
