import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

const createSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students have a planner." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  if (parsed.data.endTime <= parsed.data.startTime) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  const data = { studentId: session.user.id, ...parsed.data };
  const ref = await adminDb().collection(COLLECTIONS.availability).add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
