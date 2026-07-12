import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = adminDb();
  const [studentsSnap, submissionsSnap, readsSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
    db.collection(COLLECTIONS.homeworkSubmissions).get(),
    db.collection(COLLECTIONS.articleReads).get(),
  ]);

  const submissionCounts = new Map<string, number>();
  submissionsSnap.docs.forEach((doc) => {
    const studentId = doc.data().studentId;
    submissionCounts.set(studentId, (submissionCounts.get(studentId) ?? 0) + 1);
  });

  const readCounts = new Map<string, number>();
  readsSnap.docs.forEach((doc) => {
    const studentId = doc.data().studentId;
    readCounts.set(studentId, (readCounts.get(studentId) ?? 0) + 1);
  });

  const students = studentsSnap.docs
    .map((doc) => {
      const s = doc.data();
      return {
        id: doc.id,
        name: s.name,
        email: s.email,
        rollNumber: s.rollNumber ?? null,
        className: s.className ?? null,
        createdAt: s.createdAt,
        submissionCount: submissionCounts.get(doc.id) ?? 0,
        articleReadCount: readCounts.get(doc.id) ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(students);
}
