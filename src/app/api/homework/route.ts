import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import type { HomeworkSubmissionDoc, WithId } from "@/lib/types";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const [homeworkSnap, submissionsSnap] = await Promise.all([
    adminDb().collection(COLLECTIONS.homework).orderBy("dueDate", "asc").get(),
    adminDb().collection(COLLECTIONS.homeworkSubmissions).get(),
  ]);

  const submissionsByHomeworkId = new Map<string, WithId<HomeworkSubmissionDoc>[]>();
  for (const doc of submissionsSnap.docs) {
    const data = { id: doc.id, ...doc.data() } as WithId<HomeworkSubmissionDoc>;
    const list = submissionsByHomeworkId.get(data.homeworkId) ?? [];
    list.push(data);
    submissionsByHomeworkId.set(data.homeworkId, list);
  }

  const homework = homeworkSnap.docs.map((doc) => {
    const all = submissionsByHomeworkId.get(doc.id) ?? [];
    const submissions =
      session.user.role === "STUDENT" ? all.filter((s) => s.studentId === session.user.id) : all;
    return {
      id: doc.id,
      ...doc.data(),
      submissions,
      _count: { submissions: all.length },
    };
  });

  return NextResponse.json(homework);
}

const createSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  subject: z.string().min(1).max(100),
  dueDate: z.string().datetime().or(z.string().min(1)),
});

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    subject: parsed.data.subject,
    dueDate: new Date(parsed.data.dueDate).toISOString(),
    createdAt: new Date().toISOString(),
  };
  const ref = await adminDb().collection(COLLECTIONS.homework).add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
