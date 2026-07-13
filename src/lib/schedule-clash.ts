import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import type { ClassSessionDoc } from "@/lib/types";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// True if any student (system-wide — it's the same tutor for everyone) already
// has a class overlapping this date/time range.
export async function hasScheduleClash(
  date: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string,
): Promise<boolean> {
  const snap = await adminDb().collection(COLLECTIONS.classSessions).where("date", "==", date).get();
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);
  return snap.docs.some((d) => {
    if (d.id === excludeSessionId) return false;
    const s = d.data() as ClassSessionDoc;
    const existingStart = timeToMinutes(s.startTime);
    const existingEnd = timeToMinutes(s.endTime);
    return existingStart < newEnd && existingEnd > newStart;
  });
}
