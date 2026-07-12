import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import type { ArticleReadDoc, WithId } from "@/lib/types";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

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
    const reads = session.user.role === "STUDENT" ? all.filter((r) => r.studentId === session.user.id) : all;
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
