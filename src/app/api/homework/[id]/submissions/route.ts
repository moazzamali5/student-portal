import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";
import type { HomeworkSubmissionDoc, WithId } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const db = adminDb();

  const [homeworkDoc, studentsSnap, submissionsSnap] = await Promise.all([
    db.collection(COLLECTIONS.homework).doc(id).get(),
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
    db.collection(COLLECTIONS.homeworkSubmissions).where("homeworkId", "==", id).get(),
  ]);

  if (!homeworkDoc.exists) {
    return NextResponse.json({ error: "Homework not found" }, { status: 404 });
  }

  const submissionByStudentId = new Map<string, WithId<HomeworkSubmissionDoc>>();
  submissionsSnap.docs.forEach((doc) => {
    const submission = { id: doc.id, ...doc.data() } as WithId<HomeworkSubmissionDoc>;
    submissionByStudentId.set(submission.studentId, submission);
  });

  const rows = studentsSnap.docs
    .map((doc) => {
      const student = doc.data();
      return {
        studentId: doc.id,
        studentName: student.name,
        studentEmail: student.email,
        submission: submissionByStudentId.get(doc.id) ?? null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return NextResponse.json({ homework: { id: homeworkDoc.id, ...homeworkDoc.data() }, rows });
}
