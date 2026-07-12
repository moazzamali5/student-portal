import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionCookie } from "@/lib/session";

// Proxy defaults to the Node.js runtime in Next.js 16, so the Admin SDK
// (Node-only) can verify the session cookie directly here.
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await verifySessionCookie(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/admin")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    if (user.role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    if (user.role === "ADMIN") return NextResponse.redirect(new URL("/admin", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
