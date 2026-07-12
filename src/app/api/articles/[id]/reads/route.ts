import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";
import type { ArticleReadDoc, WithId } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const db = adminDb();

  const [articleDoc, studentsSnap, readsSnap] = await Promise.all([
    db.collection(COLLECTIONS.articles).doc(id).get(),
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
    db.collection(COLLECTIONS.articleReads).where("articleId", "==", id).get(),
  ]);

  if (!articleDoc.exists) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const readByStudentId = new Map<string, WithId<ArticleReadDoc>>();
  readsSnap.docs.forEach((doc) => {
    const read = { id: doc.id, ...doc.data() } as WithId<ArticleReadDoc>;
    readByStudentId.set(read.studentId, read);
  });

  const rows = studentsSnap.docs
    .map((doc) => {
      const student = doc.data();
      return {
        studentId: doc.id,
        studentName: student.name,
        studentEmail: student.email,
        read: readByStudentId.get(doc.id) ?? null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return NextResponse.json({ article: { id: articleDoc.id, ...articleDoc.data() }, rows });
}
