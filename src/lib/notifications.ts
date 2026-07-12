import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { sendMail } from "@/lib/mailer";
import { DAYS } from "@/lib/constants";
import type { ClassSessionDoc, HomeworkDoc, ScheduledTaskDoc, WithId } from "@/lib/types";

type EmailType = "CLASS_REMINDER" | "WEEKLY_SUMMARY" | "TASK_REMINDER";

function todayDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isoWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

async function alreadySent(type: EmailType, userId: string, referenceKey: string) {
  const doc = await adminDb().collection(COLLECTIONS.emailLog).doc(`${type}_${userId}_${referenceKey}`).get();
  return doc.exists;
}

async function markSent(type: EmailType, userId: string, referenceKey: string) {
  await adminDb()
    .collection(COLLECTIONS.emailLog)
    .doc(`${type}_${userId}_${referenceKey}`)
    .create({ type, userId, referenceKey, sentAt: new Date().toISOString() })
    .catch(() => {}); // another run already logged it — fine, we just sent a harmless duplicate
}

// Intended to run every 5 minutes; catches classes starting 55-65 minutes
// from now (so a class is only ever inside this window once, given the tick).
export async function sendClassReminders() {
  const db = adminDb();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

  const sessionsSnap = await db.collection(COLLECTIONS.classSessions).where("dayOfWeek", "==", dayOfWeek).get();
  const dueSessions = sessionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>)
    .filter((s) => {
      const [h, m] = s.startTime.split(":").map(Number);
      const classTime = new Date(now);
      classTime.setHours(h, m, 0, 0);
      return classTime >= windowStart && classTime <= windowEnd;
    });

  if (dueSessions.length === 0) return;

  const studentsSnap = await db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get();
  const dateKey = todayDateKey(now);

  for (const session of dueSessions) {
    for (const doc of studentsSnap.docs) {
      const student = doc.data();
      const referenceKey = `${session.id}:${dateKey}`;
      if (await alreadySent("CLASS_REMINDER", doc.id, referenceKey)) continue;

      await sendMail(
        student.email,
        `Reminder: ${session.subject} starts in about an hour`,
        `<p>Hi ${student.name},</p>
         <p><strong>${session.subject}</strong> starts at ${session.startTime}${
          session.room ? ` in ${session.room}` : ""
        }${session.teacher ? ` with ${session.teacher}` : ""}.</p>`,
      );

      await markSent("CLASS_REMINDER", doc.id, referenceKey);
    }
  }
}

// Intended to run once at the start of the week (Monday 06:00) — sends every
// student their week's timetable plus homework due in the next 7 days.
export async function sendWeeklyDigest() {
  const db = adminDb();
  const now = new Date();
  const weekKey = isoWeekKey(now);
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [studentsSnap, sessionsSnap, homeworkSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
    db.collection(COLLECTIONS.classSessions).get(),
    db
      .collection(COLLECTIONS.homework)
      .where("dueDate", ">=", now.toISOString())
      .where("dueDate", "<=", weekFromNow.toISOString())
      .orderBy("dueDate", "asc")
      .get(),
  ]);

  const sessions = sessionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  const homework = homeworkSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithId<HomeworkDoc>);

  const timetableHtml = DAYS.map((day, idx) => {
    const daySessions = sessions.filter((s) => s.dayOfWeek === idx);
    if (daySessions.length === 0) return "";
    const items = daySessions
      .map((s) => `<li>${s.startTime}-${s.endTime}: ${s.subject}${s.room ? ` (${s.room})` : ""}</li>`)
      .join("");
    return `<p><strong>${day}</strong></p><ul>${items}</ul>`;
  }).join("");

  const homeworkHtml = homework.length
    ? `<ul>${homework
        .map((h) => `<li>${h.title} (${h.subject}) — due ${new Date(h.dueDate).toDateString()}</li>`)
        .join("")}</ul>`
    : "<p>No homework due this week.</p>";

  for (const doc of studentsSnap.docs) {
    const student = doc.data();
    if (await alreadySent("WEEKLY_SUMMARY", doc.id, weekKey)) continue;

    await sendMail(
      student.email,
      "Your week ahead",
      `<p>Hi ${student.name}, here's your schedule for the week:</p>${timetableHtml}<p><strong>Homework due this week:</strong></p>${homeworkHtml}`,
    );

    await markSent("WEEKLY_SUMMARY", doc.id, weekKey);
  }
}

// Intended to run every 5 minutes alongside sendClassReminders; catches
// accepted planner tasks starting 25-35 minutes from now.
export async function sendTaskReminders() {
  const db = adminDb();
  const now = new Date();
  const dateKey = todayDateKey(now);
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

  const scheduledSnap = await db.collection(COLLECTIONS.scheduledTasks).where("date", "==", dateKey).get();
  const dueScheduled = scheduledSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ScheduledTaskDoc>)
    .filter((s) => {
      if (s.status !== "accepted") return false;
      const [h, m] = s.startTime.split(":").map(Number);
      const taskTime = new Date(now);
      taskTime.setHours(h, m, 0, 0);
      return taskTime >= windowStart && taskTime <= windowEnd;
    });

  if (dueScheduled.length === 0) return;

  const studentIds = [...new Set(dueScheduled.map((s) => s.studentId))];
  const taskIds = [...new Set(dueScheduled.map((s) => s.taskId))];
  const [studentDocs, taskDocs] = await Promise.all([
    Promise.all(studentIds.map((id) => db.collection(COLLECTIONS.users).doc(id).get())),
    Promise.all(taskIds.map((id) => db.collection(COLLECTIONS.tasks).doc(id).get())),
  ]);
  const studentById = new Map(studentDocs.filter((d) => d.exists).map((d) => [d.id, d.data()!]));
  const taskTitleById = new Map(taskDocs.filter((d) => d.exists).map((d) => [d.id, d.data()!.title as string]));

  for (const s of dueScheduled) {
    const student = studentById.get(s.studentId);
    if (!student) continue;
    const title = taskTitleById.get(s.taskId) ?? "Your task";
    if (await alreadySent("TASK_REMINDER", s.studentId, s.id)) continue;

    await sendMail(
      student.email,
      `Reminder: ${title} starts in 30 minutes`,
      `<p>Hi ${student.name},</p><p><strong>${title}</strong> is scheduled from ${s.startTime} to ${s.endTime} today.</p>`,
    );

    await markSent("TASK_REMINDER", s.studentId, s.id);
  }
}
