import { NextResponse } from "next/server";
import { searchGoogleBooks } from "@/lib/catalog/google-books";
import { mergeCatalogResults } from "@/lib/catalog/merge";
import {
  lookupOpenLibraryIsbn,
  searchOpenLibrary,
} from "@/lib/catalog/open-library";
import { looksLikeIsbn, normalizeIsbn } from "@/lib/isbn";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "En az 2 karakter girin.", results: [] },
      { status: 400 },
    );
  }

  try {
    if (looksLikeIsbn(q)) {
      const isbn = normalizeIsbn(q)!;
      const [openLibraryExact, openLibrarySearch, google] = await Promise.all([
        lookupOpenLibraryIsbn(isbn),
        searchOpenLibrary(`isbn:${isbn}`),
        searchGoogleBooks(`isbn:${isbn}`),
      ]);

      const results = mergeCatalogResults([
        openLibraryExact ? [openLibraryExact] : [],
        openLibrarySearch,
        google,
      ]);

      return NextResponse.json({ results, query: q, mode: "isbn" });
    }

    const [openLibrary, google] = await Promise.all([
      searchOpenLibrary(q),
      searchGoogleBooks(q),
    ]);

    const results = mergeCatalogResults([openLibrary, google]);
    return NextResponse.json({ results, query: q, mode: "title" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Arama servisleri yanıt vermedi.", results: [] },
      { status: 502 },
    );
  }
}
