import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";

const updateSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  subject: z.string().min(1).max(100),
  teacher: z.string().max(100).optional(),
  room: z.string().max(50).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ref = adminDb().collection(COLLECTIONS.classSessions).doc(id);
  await ref.update({ ...parsed.data });
  const updated = await ref.get();
  return NextResponse.json({ id: updated.id, ...updated.data() });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await adminDb().collection(COLLECTIONS.classSessions).doc(id).delete();
  return NextResponse.json({ ok: true });
}
