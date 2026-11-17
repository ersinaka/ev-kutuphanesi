import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { searchTmdb, TmdbError } from "@/lib/tmdb";
import type { MediaSearchResult, MediaType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: MediaType[] = ["movie", "tv"];

function isMediaType(value: string | null): value is MediaType {
  return VALID_TYPES.includes(value as MediaType);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type");

  if (!isMediaType(type)) {
    return NextResponse.json(
      { error: "Geçersiz içerik türü.", results: [] },
      { status: 400 },
    );
  }

  if (q.length < 2) {
    return NextResponse.json(
      { error: "En az 2 karakter girin.", results: [] },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json(
      { error: "Arama için giriş yapmalısın.", results: [] },
      { status: 401 },
    );
  }

  try {
    const results = await searchTmdb(q, type);

    if (results.length) {
      const ids = results.map((item) => item.tmdb_id);
      const { data: owned, error } = await supabase
        .from("media_items")
        .select("tmdb_id")
        .eq("user_id", authData.user.id)
        .eq("content_type", type)
        .in("tmdb_id", ids);

      if (error) throw error;

      const ownedIds = new Set((owned ?? []).map((row) => Number(row.tmdb_id)));
      const marked: MediaSearchResult[] = results.map((item) => ({
        ...item,
        alreadyOwned: ownedIds.has(item.tmdb_id),
      }));

      return NextResponse.json({ results: marked, query: q, type });
    }

    return NextResponse.json({ results: [], query: q, type });
  } catch (error) {
    if (error instanceof TmdbError) {
      if (error.kind === "missing_key") {
        console.error("TMDB_API_KEY is not configured.");
        return NextResponse.json(
          { error: "Film/Dizi araması şu anda yapılandırılmadı.", results: [] },
          { status: 503 },
        );
      }
      if (error.kind === "timeout") {
        return NextResponse.json(
          { error: "Arama zaman aşımına uğradı. Tekrar dene.", results: [] },
          { status: 504 },
        );
      }
    }

    console.error(error);
    return NextResponse.json(
      { error: "Arama şu anda kullanılamıyor. Birazdan tekrar dene.", results: [] },
      { status: 502 },
    );
  }
}
