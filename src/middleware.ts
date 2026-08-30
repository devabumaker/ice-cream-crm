import { NextRequest, NextResponse } from "next/server";
const PUBLIC = ["/login", "/api/auth/"];
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((path) => pathname === path || pathname.startsWith(path))) return NextResponse.next();
  if (!req.cookies.get("icecrm_session")?.value) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
