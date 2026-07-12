import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;

  const doc = await adminDb().collection(COLLECTIONS.users).doc(session.user.id).get();
  const user = doc.data();

  return NextResponse.json({
    id: doc.id,
    name: user?.name,
    email: user?.email,
    role: user?.role,
    rollNumber: user?.rollNumber ?? null,
    className: user?.className ?? null,
    createdAt: user?.createdAt,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100),
  rollNumber: z.string().max(50).optional(),
  className: z.string().max(50).optional(),
});

export async function PATCH(request: Request) {
  const { session, error } = await requireUser();
  if (error) return error;

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const ref = adminDb().collection(COLLECTIONS.users).doc(session.user.id);
  await ref.update({
    name: parsed.data.name,
    rollNumber: parsed.data.rollNumber ?? null,
    className: parsed.data.className ?? null,
  });

  return NextResponse.json({ id: session.user.id, name: parsed.data.name });
}
