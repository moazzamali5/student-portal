import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireApprovedParent, requireUser } from "@/lib/api-auth";
import { saveUploadedFile } from "@/lib/uploads";
import type { HomeworkDoc, HomeworkSubmissionDoc, WithId } from "@/lib/types";

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

  const homework = homeworkSnap.docs
    .filter((doc) => {
      if (!scopedStudentId) return true; // ADMIN sees everything
      const hw = doc.data() as HomeworkDoc;
      return (hw.assignedStudentIds ?? []).includes(scopedStudentId);
    })
    .map((doc) => {
      const all = submissionsByHomeworkId.get(doc.id) ?? [];
      const submissions = scopedStudentId ? all.filter((s) => s.studentId === scopedStudentId) : all;
      return {
        id: doc.id,
        ...doc.data(),
        submissions,
        _count: { submissions: all.length },
      };
    });

  return NextResponse.json(homework);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "");
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);
  const file = formData.get("file");

  if (!title || title.length > 150) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!dueDate) {
    return NextResponse.json({ error: "Due date is required." }, { status: 400 });
  }
  if (studentIds.length === 0) {
    return NextResponse.json({ error: "Select at least one student." }, { status: 400 });
  }

  const data: HomeworkDoc = {
    title,
    description: description || null,
    subject: subject || null,
    dueDate: new Date(dueDate).toISOString(),
    assignedStudentIds: studentIds,
    instructionsFileUrl: null,
    instructionsFileType: null,
    createdAt: new Date().toISOString(),
  };

  const ref = await adminDb().collection(COLLECTIONS.homework).add(data);

  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUploadedFile(file, `homework-instructions/${ref.id}`);
      data.instructionsFileUrl = saved.relativePath;
      data.instructionsFileType = saved.fileType;
      await ref.update({ instructionsFileUrl: data.instructionsFileUrl, instructionsFileType: data.instructionsFileType });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
