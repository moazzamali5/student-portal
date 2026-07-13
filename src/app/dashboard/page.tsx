import Link from "next/link";
import { getServerUser } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { ClockIcon } from "@/components/icons";
import { toLocalDateKey } from "@/lib/date-utils";
import type { ClassSessionDoc, HomeworkDoc, HomeworkSubmissionDoc, ArticleDoc, ArticleReadDoc, WithId } from "@/lib/types";

export default async function DashboardHome() {
  const user = await getServerUser();
  const studentId = user!.id;
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const db = adminDb();
  const [
    profileDoc,
    classSnap,
    homeworkSnap,
    submissionsSnap,
    articleSnap,
    readsSnap,
    homeworkCountSnap,
    articleCountSnap,
  ] = await Promise.all([
    db.collection(COLLECTIONS.users).doc(studentId).get(),
    db.collection(COLLECTIONS.classSessions).where("studentId", "==", studentId).get(),
    db.collection(COLLECTIONS.homework).where("dueDate", "<=", weekFromNow).orderBy("dueDate", "asc").get(),
    db.collection(COLLECTIONS.homeworkSubmissions).where("studentId", "==", studentId).get(),
    db.collection(COLLECTIONS.articles).orderBy("createdAt", "desc").limit(5).get(),
    db.collection(COLLECTIONS.articleReads).where("studentId", "==", studentId).get(),
    db.collection(COLLECTIONS.homework).count().get(),
    db.collection(COLLECTIONS.articles).count().get(),
  ]);
  const firstName = (profileDoc.data()?.name as string | undefined)?.split(" ")[0] ?? "there";

  const totalHomework = homeworkCountSnap.data().count;
  const totalArticles = articleCountSnap.data().count;
  const homeworkCompletionPct = totalHomework ? Math.round((submissionsSnap.size / totalHomework) * 100) : 0;
  const articlesCompletedCount = readsSnap.docs.filter((d) => d.data().closedAt).length;
  const articlesCompletionPct = totalArticles ? Math.round((articlesCompletedCount / totalArticles) * 100) : 0;

  const todaysClasses = classSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>)
    .filter((c) => c.date === todayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const mySubmissionByHomeworkId = new Map(
    submissionsSnap.docs.map((d) => {
      const submission = { id: d.id, ...d.data() } as WithId<HomeworkSubmissionDoc>;
      return [submission.homeworkId, submission] as const;
    }),
  );
  const homeworkDueSoon = homeworkSnap.docs
    .filter((d) => ((d.data() as HomeworkDoc).assignedStudentIds ?? []).includes(studentId))
    .slice(0, 5)
    .map((d) => {
      const hw = { id: d.id, ...d.data() } as WithId<HomeworkDoc>;
      const submission = mySubmissionByHomeworkId.get(d.id);
      return { ...hw, submissions: submission ? [submission] : [] };
    });

  const myReadByArticleId = new Map(
    readsSnap.docs.map((d) => {
      const read = { id: d.id, ...d.data() } as WithId<ArticleReadDoc>;
      return [read.articleId, read] as const;
    }),
  );
  const articles = articleSnap.docs.map((d) => {
    const a = { id: d.id, ...d.data() } as WithId<ArticleDoc>;
    const read = myReadByArticleId.get(d.id);
    return { ...a, reads: read ? [read] : [] };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">
        Welcome back, {firstName}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Homework completion</p>
            <span className="text-sm font-semibold text-slate-900">{homeworkCompletionPct}%</span>
          </div>
          <ProgressBar value={homeworkCompletionPct} tone="indigo" />
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Articles read</p>
            <span className="text-sm font-semibold text-slate-900">{articlesCompletionPct}%</span>
          </div>
          <ProgressBar value={articlesCompletionPct} tone="emerald" />
        </Card>
      </div>

      <Link href="/dashboard/planner" className="block">
        <Card hover className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <ClockIcon />
          </div>
          <div>
            <p className="font-medium text-slate-900">Plan your time</p>
            <p className="text-sm text-slate-500">Add your free time and to-dos — we&apos;ll build you a schedule.</p>
          </div>
        </Card>
      </Link>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Today&apos;s classes</h2>
          <Link href="/dashboard/timetable" className="text-sm text-indigo-600 hover:underline">
            Full timetable →
          </Link>
        </div>
        {todaysClasses.length === 0 ? (
          <p className="text-sm text-slate-500">No classes scheduled today.</p>
        ) : (
          <div className="space-y-2">
            {todaysClasses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="font-medium">{c.startTime}-{c.endTime}</span>
                <Badge tone={c.status === "taken" ? "success" : "default"}>{c.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Homework due soon</h2>
          <Link href="/dashboard/homework" className="text-sm text-indigo-600 hover:underline">
            All homework →
          </Link>
        </div>
        {homeworkDueSoon.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing due this week.</p>
        ) : (
          <div className="space-y-2">
            {homeworkDueSoon.map((hw) => {
              const submitted = hw.submissions.length > 0;
              const overdue = !submitted && new Date(hw.dueDate) < now;
              return (
                <div
                  key={hw.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <span>
                    {hw.title} {hw.subject && <span className="text-slate-500">({hw.subject})</span>} — due{" "}
                    {new Date(hw.dueDate).toLocaleDateString()}
                  </span>
                  <Badge tone={submitted ? "success" : overdue ? "danger" : "warning"}>
                    {submitted ? "Submitted" : overdue ? "Overdue" : "Pending"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Articles to read</h2>
          <Link href="/dashboard/articles" className="text-sm text-indigo-600 hover:underline">
            All articles →
          </Link>
        </div>
        {articles.length === 0 ? (
          <p className="text-sm text-slate-500">No articles posted yet.</p>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => {
              const read = a.reads[0];
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <Link href={`/dashboard/articles/${a.id}`} className="text-indigo-700 hover:underline">
                    {a.title}
                  </Link>
                  <Badge tone={read?.closedAt ? "success" : read?.openedAt ? "warning" : "default"}>
                    {read?.closedAt ? "Completed" : read?.openedAt ? "In progress" : "Not opened"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
