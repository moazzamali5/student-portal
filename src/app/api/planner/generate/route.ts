import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";
import { generateSchedule } from "@/lib/scheduler-algorithm";
import type { AvailabilityDoc, ClassSessionDoc, ScheduledTaskDoc, TaskDoc, WithId } from "@/lib/types";

export async function POST() {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students have a planner." }, { status: 403 });
  }

  const db = adminDb();
  const studentId = session.user.id;

  const [availabilitySnap, classSnap, tasksSnap, scheduledSnap] = await Promise.all([
    db.collection(COLLECTIONS.availability).where("studentId", "==", studentId).get(),
    db.collection(COLLECTIONS.classSessions).get(),
    db.collection(COLLECTIONS.tasks).where("studentId", "==", studentId).get(),
    db.collection(COLLECTIONS.scheduledTasks).where("studentId", "==", studentId).get(),
  ]);

  // Clear any previous not-yet-accepted proposal before generating a fresh one.
  const proposedDocsToClear = scheduledSnap.docs.filter((d) => d.data().status === "proposed");
  if (proposedDocsToClear.length > 0) {
    const clearBatch = db.batch();
    proposedDocsToClear.forEach((d) => clearBatch.delete(d.ref));
    await clearBatch.commit();
  }

  const availability = availabilitySnap.docs.map((d) => d.data() as AvailabilityDoc);
  const classSessions = classSnap.docs.map((d) => d.data() as ClassSessionDoc);
  const acceptedTasks = scheduledSnap.docs
    .filter((d) => d.data().status === "accepted")
    .map((d) => d.data() as ScheduledTaskDoc);
  const tasks = tasksSnap.docs
    .filter((d) => d.data().status === "unscheduled")
    .map((d) => {
      const t = d.data() as TaskDoc;
      return { id: d.id, durationMinutes: t.durationMinutes, deadline: t.deadline };
    });

  const { placed, unplacedTaskIds } = generateSchedule(
    availability,
    classSessions,
    acceptedTasks,
    tasks,
    new Date(),
    7,
  );

  const batch = db.batch();
  const proposedDocs: WithId<ScheduledTaskDoc>[] = [];
  for (const p of placed) {
    const ref = db.collection(COLLECTIONS.scheduledTasks).doc();
    const data: ScheduledTaskDoc = {
      taskId: p.taskId,
      studentId,
      date: p.date,
      startTime: p.startTime,
      endTime: p.endTime,
      status: "proposed",
    };
    batch.set(ref, data);
    proposedDocs.push({ id: ref.id, ...data });
  }
  await batch.commit();

  const taskTitleById = new Map(tasksSnap.docs.map((d) => [d.id, (d.data() as TaskDoc).title]));

  return NextResponse.json({
    proposed: proposedDocs.map((d) => ({ ...d, title: taskTitleById.get(d.taskId) ?? "Task" })),
    unplacedTaskIds,
  });
}
