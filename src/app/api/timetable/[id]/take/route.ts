import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireUser } from "@/lib/api-auth";
import { toLocalDateKey } from "@/lib/date-utils";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const { id } = await params;
  const ref = adminDb().collection(COLLECTIONS.classSessions).doc(id);
  const doc = await ref.get();
  const classSession = doc.data();
  if (!doc.exists || classSession?.studentId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only counts as "taken" if clicked during the class's actual scheduled
  // window — opening the link early (to test it, say) shouldn't mark
  // attendance that hasn't happened yet.
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const withinWindow =
    classSession.date === toLocalDateKey(now) &&
    nowTime >= classSession.startTime &&
    nowTime <= classSession.endTime;

  if (!withinWindow) {
    return NextResponse.json(
      { error: "This will only be marked as taken during the scheduled class time.", withinWindow: false },
      { status: 400 },
    );
  }

  await ref.update({ status: "taken" });
  return NextResponse.json({ ok: true });
}
