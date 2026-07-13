import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import { sendMail } from "@/lib/mailer";
import { hasScheduleClash } from "@/lib/schedule-clash";
import type { ClassSessionDoc, RescheduleRequestDoc, WithId } from "@/lib/types";

const createSchema = z.object({
  classSessionId: z.string().min(1),
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  newEndTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can request a reschedule." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  if (parsed.data.newEndTime <= parsed.data.newStartTime) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  const db = adminDb();
  const sessionRef = db.collection(COLLECTIONS.classSessions).doc(parsed.data.classSessionId);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists || sessionDoc.data()?.studentId !== session.user.id) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }
  const original = sessionDoc.data() as ClassSessionDoc;

  const clash = await hasScheduleClash(
    parsed.data.newDate,
    parsed.data.newStartTime,
    parsed.data.newEndTime,
    parsed.data.classSessionId,
  );
  if (clash) {
    return NextResponse.json(
      { error: "That slot is already taken by another class. Request not sent." },
      { status: 400 },
    );
  }

  const requestData = {
    studentId: session.user.id,
    classSessionId: parsed.data.classSessionId,
    originalDate: original.date,
    originalStartTime: original.startTime,
    originalEndTime: original.endTime,
    newDate: parsed.data.newDate,
    newStartTime: parsed.data.newStartTime,
    newEndTime: parsed.data.newEndTime,
    status: "PENDING" as const,
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection(COLLECTIONS.rescheduleRequests).add(requestData);

  const studentDoc = await db.collection(COLLECTIONS.users).doc(session.user.id).get();
  const studentName = (studentDoc.data()?.name as string | undefined) ?? "A student";
  await sendMail(
    process.env.SUPER_ADMIN_EMAIL ?? "",
    `Reschedule request from ${studentName}`,
    `<p>${studentName} requested to move their class from ${new Date(original.date).toDateString()} ${original.startTime}-${original.endTime} to ${new Date(parsed.data.newDate).toDateString()} ${parsed.data.newStartTime}-${parsed.data.newEndTime}.</p><p>Review it in the admin panel under Reschedule requests.</p>`,
  ).catch(() => {});

  return NextResponse.json({ id: ref.id, ...requestData }, { status: 201 });
}

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const db = adminDb();

  if (session.user.role === "STUDENT") {
    const snap = await db.collection(COLLECTIONS.rescheduleRequests).where("studentId", "==", session.user.id).get();
    const requests = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as WithId<RescheduleRequestDoc>)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json(requests);
  }

  const adminCheck = await requireAdmin();
  if (adminCheck.error) return adminCheck.error;

  const [requestsSnap, studentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.rescheduleRequests).get(),
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
  ]);
  const studentNameById = new Map(studentsSnap.docs.map((d) => [d.id, d.data().name as string]));

  const requests = requestsSnap.docs
    .map((d) => {
      const data = d.data() as RescheduleRequestDoc;
      return { id: d.id, studentName: studentNameById.get(data.studentId) ?? "Unknown", ...data };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(requests);
}
