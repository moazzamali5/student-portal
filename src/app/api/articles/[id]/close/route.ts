import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

const closeSchema = z.object({
  summary: z.string().min(1, "Please write a short summary before submitting.").max(5000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can submit article summaries." }, { status: 403 });
  }

  const parsed = closeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id: articleId } = await params;
  const studentId = session.user.id;
  const docId = `${articleId}_${studentId}`;
  const ref = adminDb().collection(COLLECTIONS.articleReads).doc(docId);

  const existing = await ref.get();
  const now = new Date().toISOString();
  const data = {
    articleId,
    studentId,
    openedAt: existing.exists ? (existing.data()!.openedAt ?? now) : now,
    closedAt: now,
    summary: parsed.data.summary,
  };

  await ref.set(data, { merge: true });
  return NextResponse.json({ id: docId, ...data });
}
