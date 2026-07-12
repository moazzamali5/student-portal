import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const db = adminDb();

  const readsSnap = await db.collection(COLLECTIONS.articleReads).where("articleId", "==", id).get();

  const batch = db.batch();
  batch.delete(db.collection(COLLECTIONS.articles).doc(id));
  readsSnap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
