import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";
import { readUploadedFile } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { submissionId } = await params;
  const doc = await adminDb().collection(COLLECTIONS.homeworkSubmissions).doc(submissionId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const submission = doc.data()!;

  const isOwner = submission.studentId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await readUploadedFile(submission.fileUrl);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[submission.fileType] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="submission.${submission.fileType}"`,
    },
  });
}
