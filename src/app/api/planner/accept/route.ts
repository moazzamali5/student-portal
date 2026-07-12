import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

export async function POST() {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students have a planner." }, { status: 403 });
  }

  const db = adminDb();
  const studentId = session.user.id;

  const scheduledSnap = await db.collection(COLLECTIONS.scheduledTasks).where("studentId", "==", studentId).get();
  const proposed = scheduledSnap.docs.filter((d) => d.data().status === "proposed");
  if (proposed.length === 0) {
    return NextResponse.json({ error: "No proposed schedule to accept. Generate one first." }, { status: 400 });
  }

  const batch = db.batch();
  const taskIds = new Set<string>();
  for (const doc of proposed) {
    batch.update(doc.ref, { status: "accepted" });
    taskIds.add(doc.data().taskId as string);
  }
  for (const taskId of taskIds) {
    batch.update(db.collection(COLLECTIONS.tasks).doc(taskId), { status: "scheduled" });
  }
  await batch.commit();

  return NextResponse.json({ ok: true, accepted: proposed.length });
}
