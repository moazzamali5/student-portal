import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { StatCard } from "@/components/ui";
import { UsersIcon, CalendarIcon, ClipboardIcon, BookIcon, UserCheckIcon } from "@/components/icons";

// Reads live DB state on every request — must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const db = adminDb();
  const [studentCountSnap, classCountSnap, homeworkCountSnap, articleCountSnap, parentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").count().get(),
    db.collection(COLLECTIONS.classSessions).count().get(),
    db.collection(COLLECTIONS.homework).count().get(),
    db.collection(COLLECTIONS.articles).count().get(),
    db.collection(COLLECTIONS.users).where("role", "==", "PARENT").get(),
  ]);
  const studentCount = studentCountSnap.data().count;
  const classCount = classCountSnap.data().count;
  const homeworkCount = homeworkCountSnap.data().count;
  const articleCount = articleCountSnap.data().count;
  const pendingParents = parentsSnap.docs.filter((d) => (d.data().approvalStatus ?? "PENDING") === "PENDING").length;

  const stats = [
    { label: "Students", value: studentCount, href: "/admin/students", icon: <UsersIcon /> },
    { label: "Timetable entries", value: classCount, href: "/admin/timetable", icon: <CalendarIcon /> },
    { label: "Homework assigned", value: homeworkCount, href: "/admin/homework", icon: <ClipboardIcon /> },
    { label: "Articles posted", value: articleCount, href: "/admin/articles", icon: <BookIcon /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} href={s.href} icon={s.icon} />
        ))}
      </div>
      {pendingParents > 0 && (
        <StatCard
          label={`Parent request${pendingParents === 1 ? "" : "s"} awaiting your approval`}
          value={pendingParents}
          href="/admin/parents"
          icon={<UserCheckIcon />}
        />
      )}
    </div>
  );
}
