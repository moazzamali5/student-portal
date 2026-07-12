import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";

// Minimal student listing for the parent-linking picker. Deliberately public
// (no session required) — a brand-new parent picks their child *before*
// their account exists, so there's no session yet to check. Only exposes
// name/rollNumber/className (no email, no activity data), unlike the
// admin-only /api/admin/students.
export async function GET() {
  const snap = await adminDb().collection(COLLECTIONS.users).where("role", "==", "STUDENT").get();
  const students = snap.docs
    .map((doc) => {
      const s = doc.data();
      return {
        id: doc.id,
        name: s.name as string,
        rollNumber: (s.rollNumber as string | null) ?? null,
        className: (s.className as string | null) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(students);
}
