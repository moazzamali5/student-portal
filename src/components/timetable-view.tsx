import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { Card } from "@/components/ui";
import { DAYS } from "@/lib/constants";

type ClassSession = {
  id: string;
  dayOfWeek: number;
  subject: string;
  teacher?: string;
  room?: string;
  startTime: string;
  endTime: string;
};

// The weekly timetable is shared/global — the same view for every student
// and every parent viewing any child, so this is one reusable component
// rather than duplicated per role.
export async function TimetableView() {
  const snap = await adminDb().collection(COLLECTIONS.classSessions).get();
  const sessions = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ClassSession)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      {DAYS.map((day, idx) => {
        const daySessions = sessions.filter((s) => s.dayOfWeek === idx);
        return (
          <Card key={day}>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">{day}</h3>
            {daySessions.length === 0 ? (
              <p className="text-sm text-slate-500">No classes.</p>
            ) : (
              <div className="space-y-2">
                {daySessions.map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <span className="font-medium">
                      {s.startTime}-{s.endTime}
                    </span>{" "}
                    — {s.subject}
                    {s.teacher ? ` · ${s.teacher}` : ""}
                    {s.room ? ` · ${s.room}` : ""}
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
