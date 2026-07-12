import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";

const registerSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(1).max(100),
  rollNumber: z.string().max(50).optional(),
  className: z.string().max(50).optional(),
  requestedRole: z.enum(["STUDENT", "PARENT"]).optional(),
  linkedStudentIds: z.array(z.string()).max(20).optional(),
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
  const isSuperAdmin = email.toLowerCase() === superAdminEmail;
  const role = isSuperAdmin ? "ADMIN" : (parsed.data.requestedRole ?? "STUDENT");
  const { name, rollNumber, className } = parsed.data;

  if (role === "PARENT" && (!parsed.data.linkedStudentIds || parsed.data.linkedStudentIds.length === 0)) {
    return NextResponse.json({ error: "Select at least one student to link to." }, { status: 400 });
  }

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
      ...(role === "PARENT"
        ? { linkedStudentIds: parsed.data.linkedStudentIds, approvalStatus: "PENDING" }
        : {}),
    });

  return NextResponse.json({ id: uid, email, role }, { status: 201 });
}
