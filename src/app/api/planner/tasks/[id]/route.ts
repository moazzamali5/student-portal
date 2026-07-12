import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const db = adminDb();
  const ref = db.collection(COLLECTIONS.tasks).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const scheduledSnap = await db.collection(COLLECTIONS.scheduledTasks).where("taskId", "==", id).get();
  const batch = db.batch();
  batch.delete(ref);
  scheduledSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
