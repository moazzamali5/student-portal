import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireApprovedParent, requireUser } from "@/lib/api-auth";
import type { ArticleReadDoc, WithId } from "@/lib/types";

export async function GET(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  let scopedStudentId: string | null = null;
  if (session.user.role === "STUDENT") {
    scopedStudentId = session.user.id;
  } else if (session.user.role === "PARENT") {
    const parentCheck = await requireApprovedParent();
    if (parentCheck.error) return parentCheck.error;
    const childId = new URL(request.url).searchParams.get("child");
    if (!childId || !parentCheck.linkedStudentIds.includes(childId)) {
      return NextResponse.json({ error: "Specify a valid child." }, { status: 400 });
    }
    scopedStudentId = childId;
  }

  const [articlesSnap, readsSnap] = await Promise.all([
    adminDb().collection(COLLECTIONS.articles).orderBy("createdAt", "desc").get(),
    adminDb().collection(COLLECTIONS.articleReads).get(),
  ]);

  const readsByArticleId = new Map<string, WithId<ArticleReadDoc>[]>();
  for (const doc of readsSnap.docs) {
    const data = { id: doc.id, ...doc.data() } as WithId<ArticleReadDoc>;
    const list = readsByArticleId.get(data.articleId) ?? [];
    list.push(data);
    readsByArticleId.set(data.articleId, list);
  }

  const articles = articlesSnap.docs.map((doc) => {
    const all = readsByArticleId.get(doc.id) ?? [];
    const reads = scopedStudentId ? all.filter((r) => r.studentId === scopedStudentId) : all;
    return { id: doc.id, ...doc.data(), reads };
  });

  return NextResponse.json(articles);
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
});

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = { ...parsed.data, createdAt: new Date().toISOString() };
  const ref = await adminDb().collection(COLLECTIONS.articles).add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
