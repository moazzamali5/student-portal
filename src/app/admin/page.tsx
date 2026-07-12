import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { Card } from "@/components/ui";

// Reads live DB state on every request — must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const db = adminDb();
  const [studentCountSnap, classCountSnap, homeworkCountSnap, articleCountSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").count().get(),
    db.collection(COLLECTIONS.classSessions).count().get(),
    db.collection(COLLECTIONS.homework).count().get(),
    db.collection(COLLECTIONS.articles).count().get(),
  ]);
  const studentCount = studentCountSnap.data().count;
  const classCount = classCountSnap.data().count;
  const homeworkCount = homeworkCountSnap.data().count;
  const articleCount = articleCountSnap.data().count;

  const stats = [
    { label: "Students", value: studentCount, href: "/admin/students" },
    { label: "Timetable entries", value: classCount, href: "/admin/timetable" },
    { label: "Homework assigned", value: homeworkCount, href: "/admin/homework" },
    { label: "Articles posted", value: articleCount, href: "/admin/articles" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-indigo-300">
              <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-600">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
