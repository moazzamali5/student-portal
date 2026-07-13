import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";
import { hasScheduleClash } from "@/lib/schedule-clash";
import type { RescheduleRequestDoc } from "@/lib/types";

const bodySchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const db = adminDb();
  const ref = db.collection(COLLECTIONS.rescheduleRequests).doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const reqData = doc.data() as RescheduleRequestDoc;
  if (reqData.status !== "PENDING") {
    return NextResponse.json({ error: "This request has already been decided." }, { status: 400 });
  }

  if (parsed.data.status === "APPROVED") {
    // Re-check for a clash — another approval could have landed in between.
    const clash = await hasScheduleClash(reqData.newDate, reqData.newStartTime, reqData.newEndTime, reqData.classSessionId);
    if (clash) {
      return NextResponse.json({ error: "That slot has since been taken by another class." }, { status: 400 });
    }
    await db.collection(COLLECTIONS.classSessions).doc(reqData.classSessionId).update({
      date: reqData.newDate,
      startTime: reqData.newStartTime,
      endTime: reqData.newEndTime,
    });
  }

  await ref.update({ status: parsed.data.status });
  return NextResponse.json({ ok: true });
}
