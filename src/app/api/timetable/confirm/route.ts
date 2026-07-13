import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";
import { sendMail } from "@/lib/mailer";

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  classLink: z.string().url().optional().or(z.literal("")),
});

const bodySchema = z.object({
  studentIds: z.array(z.string()).min(1),
  entries: z.array(entrySchema).min(1),
});

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const db = adminDb();
  const { studentIds, entries } = parsed.data;
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const batch = db.batch();
  for (const studentId of studentIds) {
    for (const entry of sortedEntries) {
      const ref = db.collection(COLLECTIONS.classSessions).doc();
      batch.set(ref, {
        studentId,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        classLink: entry.classLink || null,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      });
    }
  }
  await batch.commit();

  const studentDocs = await Promise.all(studentIds.map((id) => db.collection(COLLECTIONS.users).doc(id).get()));
  const itemsHtml = sortedEntries
    .map((e) => `<li>${new Date(e.date).toDateString()}: ${e.startTime}-${e.endTime}</li>`)
    .join("");
  for (const doc of studentDocs) {
    if (!doc.exists) continue;
    const student = doc.data()!;
    await sendMail(
      student.email,
      "Your timetable has been updated",
      `<p>Hi ${student.name},</p><p>Your class schedule has been updated:</p><ul>${itemsHtml}</ul>`,
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true, created: studentIds.length * sortedEntries.length });
}
