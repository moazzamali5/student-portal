import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const db = adminDb();
  const [parentsSnap, studentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).where("role", "==", "PARENT").get(),
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
  ]);

  const studentNameById = new Map(studentsSnap.docs.map((d) => [d.id, d.data().name as string]));

  const parents = parentsSnap.docs
    .map((doc) => {
      const p = doc.data();
      const linkedStudentIds = (p.linkedStudentIds as string[] | undefined) ?? [];
      return {
        id: doc.id,
        name: p.name,
        email: p.email,
        approvalStatus: p.approvalStatus ?? "PENDING",
        createdAt: p.createdAt,
        children: linkedStudentIds.map((id) => ({ id, name: studentNameById.get(id) ?? "Unknown student" })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(parents);
}
