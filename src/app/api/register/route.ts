import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";

const registerSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(1).max(100),
  rollNumber: z.string().max(50).optional(),
  className: z.string().max(50).optional(),
});

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(parsed.data.idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired sign-in. Please try again." }, { status: 401 });
  }

  const { uid, email } = decoded;
  if (!email) {
    return NextResponse.json({ error: "Account has no email." }, { status: 400 });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  const role = email.toLowerCase() === superAdminEmail ? "ADMIN" : "STUDENT";
  const { name, rollNumber, className } = parsed.data;

  await adminAuth().setCustomUserClaims(uid, { role });

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(uid)
    .set({
      name,
      email,
      role,
      rollNumber: rollNumber ?? null,
      className: className ?? null,
      createdAt: new Date().toISOString(),
    });

  return NextResponse.json({ id: uid, email, role }, { status: 201 });
}
