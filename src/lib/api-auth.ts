import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookie, type AppUser } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";

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

// Approval status lives in Firestore (not the JWT custom claim) so an
// admin's approve/reject action takes effect immediately, without the
// parent needing to refresh their ID token.
export async function requireApprovedParent(): Promise<
  | { session: { user: AppUser }; linkedStudentIds: string[]; error: null }
  | { session: null; linkedStudentIds: null; error: NextResponse }
> {
  const { session, error } = await requireUser();
  if (error) return { session: null, linkedStudentIds: null, error };
  if (session.user.role !== "PARENT") {
    return { session: null, linkedStudentIds: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const doc = await adminDb().collection(COLLECTIONS.users).doc(session.user.id).get();
  const data = doc.data();
  if (data?.approvalStatus !== "APPROVED") {
    return {
      session: null,
      linkedStudentIds: null,
      error: NextResponse.json({ error: "Your account is pending admin approval." }, { status: 403 }),
    };
  }

  return { session, linkedStudentIds: (data.linkedStudentIds as string[] | undefined) ?? [], error: null };
}
