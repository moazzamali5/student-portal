import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireApprovedParent, requireUser } from "@/lib/api-auth";
import { readUploadedFile } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const doc = await adminDb().collection(COLLECTIONS.homework).doc(id).get();
  if (!doc.exists || !doc.data()?.instructionsFileUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const homework = doc.data()!;
  const assignedStudentIds = (homework.assignedStudentIds as string[] | undefined) ?? [];

  const isAdmin = session.user.role === "ADMIN";
  const isAssignedStudent = session.user.role === "STUDENT" && assignedStudentIds.includes(session.user.id);
  let isParentOfAssigned = false;
  if (!isAdmin && !isAssignedStudent && session.user.role === "PARENT") {
    const parentCheck = await requireApprovedParent();
    isParentOfAssigned = !parentCheck.error && parentCheck.linkedStudentIds.some((id) => assignedStudentIds.includes(id));
  }
  if (!isAdmin && !isAssignedStudent && !isParentOfAssigned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await readUploadedFile(homework.instructionsFileUrl);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[homework.instructionsFileType] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="instructions.${homework.instructionsFileType}"`,
    },
  });
}
