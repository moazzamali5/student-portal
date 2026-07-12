import { TimetableView } from "@/components/timetable-view";

export const dynamic = "force-dynamic";

export default function ParentTimetablePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Weekly timetable</h1>
      <TimetableView />
    </div>
  );
}
