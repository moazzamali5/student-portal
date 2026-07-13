import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { sendMail } from "@/lib/mailer";
import { toLocalDateKey, formatTime12h, formatTimeRange12h } from "@/lib/date-utils";
import { appUrl, emailButton, emailList, renderEmail } from "@/lib/email-template";
import type { ClassSessionDoc, HomeworkDoc, ScheduledTaskDoc, WithId } from "@/lib/types";

type EmailType = "CLASS_REMINDER" | "WEEKLY_SUMMARY" | "TASK_REMINDER" | "PARENT_WEEKLY_DIGEST";

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

function timetableHtmlFor(sessions: WithId<ClassSessionDoc>[]) {
  return emailList(
    sessions.map((s) => `${new Date(s.date).toDateString()}: ${formatTimeRange12h(s.startTime, s.endTime)}`),
    "No classes scheduled this week.",
  );
}

function homeworkHtmlFor(homework: WithId<HomeworkDoc>[]) {
  return emailList(
    homework.map((h) => `${h.title} — due ${new Date(h.dueDate).toDateString()}`),
    "No homework due this week.",
  );
}

// Intended to run every 5 minutes; catches classes starting 25-35 minutes
// from now (so a class is only ever inside this window once, given the tick).
export async function sendClassReminders() {
  const db = adminDb();
  const now = new Date();
  const dateKey = toLocalDateKey(now);
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

  const sessionsSnap = await db.collection(COLLECTIONS.classSessions).where("date", "==", dateKey).get();
  const dueSessions = sessionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>)
    .filter((s) => {
      if (s.status === "taken") return false;
      const [h, m] = s.startTime.split(":").map(Number);
      const classTime = new Date(now);
      classTime.setHours(h, m, 0, 0);
      return classTime >= windowStart && classTime <= windowEnd;
    });

  if (dueSessions.length === 0) return;

  const studentDocs = await Promise.all(
    [...new Set(dueSessions.map((s) => s.studentId))].map((id) => db.collection(COLLECTIONS.users).doc(id).get()),
  );
  const studentById = new Map(studentDocs.filter((d) => d.exists).map((d) => [d.id, d.data()!]));

  for (const classSession of dueSessions) {
    const student = studentById.get(classSession.studentId);
    if (!student) continue;
    if (await alreadySent("CLASS_REMINDER", classSession.studentId, classSession.id)) continue;

    await sendMail(
      student.email,
      "Reminder: your class starts in 30 minutes",
      renderEmail({
        heading: "Your class starts soon",
        preheader: `Your class starts at ${formatTime12h(classSession.startTime)} today.`,
        bodyHtml: `
          <p>Hi ${student.name},</p>
          <p>Your class starts at <strong>${formatTime12h(classSession.startTime)}</strong> today.</p>
          ${classSession.classLink ? emailButton("Join class", classSession.classLink) : ""}
          <p style="margin-top:18px;font-size:13px;">
            <a href="${appUrl("/dashboard/timetable")}" style="color:#4f46e5;">View your full timetable in the portal →</a>
          </p>
        `,
      }),
    );

    await markSent("CLASS_REMINDER", classSession.studentId, classSession.id);
  }
}

// Intended to run once at the start of the week (Monday 06:00) — sends every
// student their own classes and homework due in the next 7 days.
export async function sendWeeklyDigest() {
  const db = adminDb();
  const now = new Date();
  const weekKey = isoWeekKey(now);
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayKey = toLocalDateKey(now);
  const weekFromNowKey = toLocalDateKey(weekFromNow);

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

  const sessions = sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>);
  const homework = homeworkSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithId<HomeworkDoc>);

  for (const doc of studentsSnap.docs) {
    const student = doc.data();
    if (await alreadySent("WEEKLY_SUMMARY", doc.id, weekKey)) continue;

    const mySessions = sessions
      .filter((s) => s.studentId === doc.id && s.date >= todayKey && s.date <= weekFromNowKey)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const myHomework = homework.filter((h) => (h.assignedStudentIds ?? []).includes(doc.id));

    await sendMail(
      student.email,
      "Your week ahead",
      renderEmail({
        heading: "Your week ahead",
        preheader: "Here's your schedule and homework for the week.",
        bodyHtml: `
          <p>Hi ${student.name}, here's your schedule for the week:</p>
          ${timetableHtmlFor(mySessions)}
          <p style="margin-top:16px;"><strong>Homework due this week:</strong></p>
          ${homeworkHtmlFor(myHomework)}
          ${emailButton("View in portal", appUrl("/dashboard/timetable"))}
        `,
      }),
    );

    await markSent("WEEKLY_SUMMARY", doc.id, weekKey);
  }
}

// Intended to run every Sunday — sends each approved parent one email
// covering all their linked children's upcoming week (separate from the
// Monday student digest since the cadence and audience both differ).
export async function sendParentWeeklyDigest() {
  const db = adminDb();
  const now = new Date();
  const weekKey = isoWeekKey(now);
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayKey = toLocalDateKey(now);
  const weekFromNowKey = toLocalDateKey(weekFromNow);

  const [parentsSnap, sessionsSnap, homeworkSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).where("role", "==", "PARENT").get(),
    db.collection(COLLECTIONS.classSessions).get(),
    db
      .collection(COLLECTIONS.homework)
      .where("dueDate", ">=", now.toISOString())
      .where("dueDate", "<=", weekFromNow.toISOString())
      .orderBy("dueDate", "asc")
      .get(),
  ]);

  const sessions = sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>);
  const homework = homeworkSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithId<HomeworkDoc>);

  for (const doc of parentsSnap.docs) {
    const parent = doc.data();
    if (parent.approvalStatus !== "APPROVED") continue;
    const linkedStudentIds: string[] = parent.linkedStudentIds ?? [];
    if (linkedStudentIds.length === 0) continue;
    if (await alreadySent("PARENT_WEEKLY_DIGEST", doc.id, weekKey)) continue;

    const childDocs = await Promise.all(linkedStudentIds.map((id) => db.collection(COLLECTIONS.users).doc(id).get()));
    let bodyHtml = "";
    for (const childDoc of childDocs) {
      if (!childDoc.exists) continue;
      const childName = childDoc.data()!.name as string;
      const childSessions = sessions
        .filter((s) => s.studentId === childDoc.id && s.date >= todayKey && s.date <= weekFromNowKey)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      const childHomework = homework.filter((h) => (h.assignedStudentIds ?? []).includes(childDoc.id));

      bodyHtml += `<h3 style="margin:18px 0 4px;font-size:15px;color:#0f172a;">${childName}</h3>${timetableHtmlFor(childSessions)}${homeworkHtmlFor(childHomework)}`;
    }
    if (!bodyHtml) continue;

    await sendMail(
      parent.email,
      "Your child's week ahead",
      renderEmail({
        heading: "Your child's week ahead",
        preheader: "This week's schedule and homework for your children.",
        bodyHtml: `
          <p>Hi ${parent.name}, here's the week ahead:</p>
          ${bodyHtml}
          ${emailButton("View in portal", appUrl("/parent/timetable"))}
        `,
      }),
    );

    await markSent("PARENT_WEEKLY_DIGEST", doc.id, weekKey);
  }
}

// Intended to run every 5 minutes alongside sendClassReminders; catches
// accepted planner tasks starting 25-35 minutes from now.
export async function sendTaskReminders() {
  const db = adminDb();
  const now = new Date();
  const dateKey = toLocalDateKey(now);
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
      renderEmail({
        heading: "Your task starts soon",
        preheader: `${title} is scheduled from ${formatTimeRange12h(s.startTime, s.endTime)} today.`,
        bodyHtml: `
          <p>Hi ${student.name},</p>
          <p><strong>${title}</strong> is scheduled from <strong>${formatTimeRange12h(s.startTime, s.endTime)}</strong> today.</p>
          ${emailButton("View planner", appUrl("/dashboard/planner"))}
        `,
      }),
    );

    await markSent("TASK_REMINDER", s.studentId, s.id);
  }
}
