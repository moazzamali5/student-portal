import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";
import { saveUploadedFile } from "@/lib/uploads";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can submit homework." }, { status: 403 });
  }

  const { id: homeworkId } = await params;

  const homeworkDoc = await adminDb().collection(COLLECTIONS.homework).doc(homeworkId).get();
  if (!homeworkDoc.exists) {
    return NextResponse.json({ error: "Homework not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  let saved;
  try {
    saved = await saveUploadedFile(file, `homework/${session.user.id}`);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const studentId = session.user.id;
  const submission = {
    homeworkId,
    studentId,
    fileUrl: saved.relativePath,
    fileType: saved.fileType,
    submittedAt: new Date().toISOString(),
  };

  const docId = `${homeworkId}_${studentId}`;
  await adminDb().collection(COLLECTIONS.homeworkSubmissions).doc(docId).set(submission);

  return NextResponse.json({ id: docId, ...submission }, { status: 201 });
}
