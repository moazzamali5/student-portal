import { TimetableView } from "@/components/timetable-view";

// Reads live DB state on every request — must not be statically prerendered.
export const dynamic = "force-dynamic";

export default function StudentTimetablePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Weekly timetable</h1>
      <TimetableView />
    </div>
  );
}
