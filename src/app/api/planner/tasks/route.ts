import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

const createSchema = z.object({
  title: z.string().min(1).max(150),
  durationMinutes: z.number().int().min(5).max(480),
  deadline: z.string().optional(),
  notes: z.string().max(1000).optional(),
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

  const data = {
    studentId: session.user.id,
    title: parsed.data.title,
    durationMinutes: parsed.data.durationMinutes,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline).toISOString().slice(0, 10) : null,
    notes: parsed.data.notes ?? null,
    status: "unscheduled" as const,
    createdAt: new Date().toISOString(),
  };
  const ref = await adminDb().collection(COLLECTIONS.tasks).add(data);
  return NextResponse.json({ id: ref.id, ...data }, { status: 201 });
}
