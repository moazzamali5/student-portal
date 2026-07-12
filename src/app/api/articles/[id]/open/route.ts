import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can read articles." }, { status: 403 });
  }

  const { id: articleId } = await params;
  const studentId = session.user.id;
  const docId = `${articleId}_${studentId}`;
  const ref = adminDb().collection(COLLECTIONS.articleReads).doc(docId);

  const existing = await ref.get();
  if (existing.exists && existing.data()!.openedAt) {
    return NextResponse.json({ id: docId, ...existing.data() });
  }

  const data = existing.exists
    ? { ...existing.data(), openedAt: new Date().toISOString() }
    : {
        articleId,
        studentId,
        openedAt: new Date().toISOString(),
        closedAt: null,
        summary: null,
      };

  await ref.set(data, { merge: true });
  return NextResponse.json({ id: docId, ...data });
}
