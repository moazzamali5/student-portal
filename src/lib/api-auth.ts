import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookie, type AppUser } from "@/lib/session";

export async function requireUser(): Promise<
  { session: { user: AppUser }; error: null } | { session: null; error: NextResponse }
> {
  const cookieStore = await cookies();
  const user = await verifySessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session: { user }, error: null };
}

export async function requireAdmin() {
  const { session, error } = await requireUser();
  if (error) return { session: null, error };
  if (session.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
