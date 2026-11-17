import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/", "/ekle", "/medya", "/kitap"];

function hasAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"),
    );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isProtected && !hasAuthCookie(request)) {
    const url = new URL("/giris", request.url);
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/ekle/:path*", "/medya/:path*", "/kitap/:path*"],
};
