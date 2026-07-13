import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const ref = adminDb().collection(COLLECTIONS.classSessions).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ref.update({ status: "taken" });
  return NextResponse.json({ ok: true });
}
