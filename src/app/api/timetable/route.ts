import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireApprovedParent, requireUser } from "@/lib/api-auth";
import type { ClassSessionDoc, WithId } from "@/lib/types";

export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  let studentId: string;
  if (session.user.role === "STUDENT") {
    studentId = session.user.id;
  } else if (session.user.role === "PARENT") {
    const parentCheck = await requireApprovedParent();
    if (parentCheck.error) return parentCheck.error;
    const childId = new URL(request.url).searchParams.get("child");
    if (!childId || !parentCheck.linkedStudentIds.includes(childId)) {
      return NextResponse.json({ error: "Specify a valid child." }, { status: 400 });
    }
    studentId = childId;
  } else {
    // ADMIN — must specify which student's timetable to view.
    const adminCheck = await requireAdmin();
    if (adminCheck.error) return adminCheck.error;
    const requested = new URL(request.url).searchParams.get("student");
    if (!requested) {
      return NextResponse.json({ error: "Specify a student." }, { status: 400 });
    }
    studentId = requested;
  }

  const snap = await adminDb().collection(COLLECTIONS.classSessions).where("studentId", "==", studentId).get();
  const sessions = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  return NextResponse.json(sessions);
}
