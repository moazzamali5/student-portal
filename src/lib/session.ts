import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export type Role = "STUDENT" | "ADMIN";
export type AppUser = { id: string; email: string; role: Role; name?: string };

export async function verifySessionCookie(cookie: string | undefined): Promise<AppUser | null> {
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const role: Role = decoded.role === "ADMIN" ? "ADMIN" : "STUDENT";
    return { id: decoded.uid, email: decoded.email ?? "", role, name: decoded.name };
  } catch {
    return null;
  }
}

// For Server Components — reads the cookie itself (calling cookies() also
// opts the page out of static rendering, same effect as force-dynamic).
export async function getServerUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(SESSION_COOKIE)?.value);
}
