import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";
import type { AvailabilityDoc, ScheduledTaskDoc, WithId } from "@/lib/types";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students have a planner." }, { status: 403 });
  }

  const db = adminDb();
  const studentId = session.user.id;
  const [availabilitySnap, tasksSnap, scheduledSnap] = await Promise.all([
    db.collection(COLLECTIONS.availability).where("studentId", "==", studentId).get(),
    db.collection(COLLECTIONS.tasks).where("studentId", "==", studentId).get(),
    db.collection(COLLECTIONS.scheduledTasks).where("studentId", "==", studentId).get(),
  ]);

  const availability = availabilitySnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<AvailabilityDoc>)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const scheduledTasks = scheduledSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ScheduledTaskDoc>)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return NextResponse.json({ availability, tasks, scheduledTasks });
}
