import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireApprovedParent, requireUser } from "@/lib/api-auth";
import { toLocalDateKey } from "@/lib/date-utils";
import type { ClassSessionDoc, WithId } from "@/lib/types";

export type AdminAgendaEntry = WithId<ClassSessionDoc> & {
  studentName: string;
  rollNumber: string | null;
  className: string | null;
};

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
    // ADMIN — either a consolidated all-students agenda, or one student's timetable.
    const adminCheck = await requireAdmin();
    if (adminCheck.error) return adminCheck.error;

    if (new URL(request.url).searchParams.get("all") === "1") {
      const db = adminDb();
      const todayKey = toLocalDateKey(new Date());
      const [sessionsSnap, studentsSnap] = await Promise.all([
        db.collection(COLLECTIONS.classSessions).where("date", ">=", todayKey).get(),
        db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
      ]);
      const studentById = new Map(studentsSnap.docs.map((d) => [d.id, d.data()]));
      const entries: AdminAgendaEntry[] = sessionsSnap.docs
        .map((d) => {
          const s = { id: d.id, ...d.data() } as WithId<ClassSessionDoc>;
          const student = studentById.get(s.studentId);
          return {
            ...s,
            studentName: (student?.name as string | undefined) ?? "Unknown",
            rollNumber: (student?.rollNumber as string | null | undefined) ?? null,
            className: (student?.className as string | null | undefined) ?? null,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

      return NextResponse.json(entries);
    }

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
