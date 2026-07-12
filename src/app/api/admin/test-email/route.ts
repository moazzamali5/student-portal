import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { sendMail } from "@/lib/mailer";

export async function POST() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const result = await sendMail(
    session!.user.email!,
    "Student Portal — test email",
    `<p>This is a test email from the Student Portal, sent at ${new Date().toLocaleString()}.</p>
     <p>If you received this, your SMTP configuration is working correctly.</p>`,
  );

  if (!result.sent) {
    return NextResponse.json(
      { error: "SMTP is not configured. Fill in SMTP_HOST/SMTP_USER/SMTP_PASS in .env and restart the server." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
