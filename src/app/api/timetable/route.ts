import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin, requireUser } from "@/lib/api-auth";
import type { ClassSessionDoc, WithId } from "@/lib/types";

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;

  const snap = await adminDb().collection(COLLECTIONS.classSessions).get();
  const sessions = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return NextResponse.json(sessions);
}

const createSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  subject: z.string().min(1).max(100),
  teacher: z.string().max(100).optional(),
  room: z.string().max(50).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = { ...parsed.data, createdAt: new Date().toISOString() };
  const ref = await adminDb().collection(COLLECTIONS.classSessions).add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
