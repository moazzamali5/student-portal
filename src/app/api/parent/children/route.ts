import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireApprovedParent } from "@/lib/api-auth";

export async function GET() {
  const { linkedStudentIds, error } = await requireApprovedParent();
  if (error) return error;

  if (linkedStudentIds.length === 0) return NextResponse.json([]);

  const db = adminDb();
  const docs = await Promise.all(linkedStudentIds.map((id) => db.collection(COLLECTIONS.users).doc(id).get()));
  const children = docs
    .filter((d) => d.exists)
    .map((d) => ({
      id: d.id,
      name: d.data()!.name as string,
      rollNumber: (d.data()!.rollNumber as string | null) ?? null,
      className: (d.data()!.className as string | null) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(children);
}
