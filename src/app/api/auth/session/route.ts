import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/session";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing ID token." }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(parsed.data.idToken, true);
  } catch {
    return NextResponse.json({ error: "Invalid or expired sign-in. Please try again." }, { status: 401 });
  }

  const sessionCookie = await adminAuth().createSessionCookie(parsed.data.idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });

  const role = decoded.role === "ADMIN" ? "ADMIN" : decoded.role === "PARENT" ? "PARENT" : "STUDENT";
  return NextResponse.json({ role });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
