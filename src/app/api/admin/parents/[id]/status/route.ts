import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";

const bodySchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "PENDING"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ref = adminDb().collection(COLLECTIONS.users).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.role !== "PARENT") {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  await ref.update({ approvalStatus: parsed.data.status });
  return NextResponse.json({ ok: true });
}
