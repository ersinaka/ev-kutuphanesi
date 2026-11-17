import { supabase } from "@/lib/supabase/client";
import type {
  MediaInsert,
  MediaItem,
  MediaSearchResult,
  MediaType,
  MediaUpdate,
} from "@/lib/types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

type TmdbImageSize = "w342" | "w500" | "w780" | "original";

export function tmdbImageUrl(
  path: string | null | undefined,
  size: TmdbImageSize = "w500",
): string | null {
  if (!path) return null;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE}/${size}${clean}`;
}

export function mediaKey(type: MediaType, tmdbId: number) {
  return `${type}:${tmdbId}`;
}

export async function listMyMedia(type?: MediaType): Promise<MediaItem[]> {
  let query = supabase
    .from("media_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (type) query = query.eq("content_type", type);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

export async function getMyMediaKeys(type?: MediaType): Promise<Set<string>> {
  let query = supabase.from("media_items").select("content_type,tmdb_id");
  if (type) query = query.eq("content_type", type);

  const { data, error } = await query;
  if (error) throw error;

  return new Set(
    (data ?? []).map((row) =>
      mediaKey(row.content_type as MediaType, Number(row.tmdb_id)),
    ),
  );
}

export function isDuplicateMediaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code: unknown }).code) : "";
  const message =
    "message" in error ? String((error as { message: unknown }).message) : "";
  return (
    code === "23505" ||
    /duplicate key|unique constraint|media_items_user_type_tmdb_unique/i.test(
      message,
    )
  );
}

export async function addMedia(input: MediaInsert): Promise<MediaItem> {
  const payload: MediaInsert = {
    ...input,
    title: input.title.trim(),
    original_title: input.original_title || null,
    release_date: input.release_date || null,
    overview: input.overview || null,
    poster_path: input.poster_path || null,
    backdrop_path: input.backdrop_path || null,
    original_language: input.original_language || null,
    vote_average: input.vote_average ?? null,
    genre_ids: input.genre_ids ?? [],
    metadata: input.metadata ?? {},
    watch_status: input.watch_status ?? "planned",
    rating: input.rating ?? null,
    review: input.review || null,
  };

  const { data, error } = await supabase
    .from("media_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as MediaItem;
}

export async function updateMedia(
  id: string,
  input: MediaUpdate,
): Promise<MediaItem> {
  const payload: MediaUpdate = { ...input };

  if (typeof payload.title === "string") payload.title = payload.title.trim();
  if ("original_title" in payload) payload.original_title = payload.original_title || null;
  if ("release_date" in payload) payload.release_date = payload.release_date || null;
  if ("overview" in payload) payload.overview = payload.overview || null;
  if ("poster_path" in payload) payload.poster_path = payload.poster_path || null;
  if ("backdrop_path" in payload) payload.backdrop_path = payload.backdrop_path || null;
  if ("original_language" in payload) {
    payload.original_language = payload.original_language || null;
  }
  if ("rating" in payload && (payload.rating == null || Number.isNaN(payload.rating))) {
    payload.rating = null;
  }
  if ("review" in payload) payload.review = payload.review || null;

  const { data, error } = await supabase
    .from("media_items")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as MediaItem;
}

export async function deleteMedia(id: string) {
  const { error } = await supabase.from("media_items").delete().eq("id", id);
  if (error) throw error;
}

export async function searchMedia(
  query: string,
  type: MediaType,
  signal?: AbortSignal,
): Promise<MediaSearchResult[]> {
  const params = new URLSearchParams({ q: query, type });
  const response = await fetch(`/api/media/search?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  const body = (await response.json().catch(() => null)) as
    | { results?: MediaSearchResult[]; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error || "Arama şu anda kullanılamıyor.");
  }

  return body?.results ?? [];
}
