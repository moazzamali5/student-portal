import { toLocalDateKey } from "@/lib/date-utils";

type TimeBlock = { dayOfWeek: number; startTime: string; endTime: string };
type DateBlock = { date: string; startTime: string; endTime: string };
type TaskInput = { id: string; durationMinutes: number; deadline: string | null };

export type PlacedTask = { taskId: string; date: string; startTime: string; endTime: string };

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

function subtractBusy(free: [number, number][], busy: [number, number][]): [number, number][] {
  let result = free;
  for (const [busyStart, busyEnd] of busy) {
    const next: [number, number][] = [];
    for (const [fs, fe] of result) {
      if (busyEnd <= fs || busyStart >= fe) {
        next.push([fs, fe]);
        continue;
      }
      if (busyStart > fs) next.push([fs, busyStart]);
      if (busyEnd < fe) next.push([busyEnd, fe]);
    }
    result = next;
  }
  return result.sort((a, b) => a[0] - b[0]);
}

// Greedy bin-packing: for each of the next `days` calendar days, compute free
// time (declared availability minus the class timetable minus already-accepted
// tasks), then place not-yet-scheduled tasks — soonest deadline first, tasks
// without a deadline last, ties broken by longer duration first — into the
// first free interval each one fits. Tasks aren't split across intervals.
export function generateSchedule(
  availability: TimeBlock[],
  classSessions: DateBlock[],
  acceptedTasks: DateBlock[],
  tasks: TaskInput[],
  startDate: Date,
  days = 7,
): { placed: PlacedTask[]; unplacedTaskIds: string[] } {
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return b.durationMinutes - a.durationMinutes;
  });

  const placed: PlacedTask[] = [];
  const placedIds = new Set<string>();

  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const date = new Date(startDate.getTime() + dayOffset * 86400000);
    const dayOfWeek = date.getDay();
    const dateKey = toLocalDateKey(date);

    const freeFromAvailability: [number, number][] = availability
      .filter((a) => a.dayOfWeek === dayOfWeek)
      .map((a) => [timeToMinutes(a.startTime), timeToMinutes(a.endTime)]);

    const classBusy: [number, number][] = classSessions
      .filter((c) => c.date === dateKey)
      .map((c) => [timeToMinutes(c.startTime), timeToMinutes(c.endTime)]);

    const acceptedBusy: [number, number][] = acceptedTasks
      .filter((t) => t.date === dateKey)
      .map((t) => [timeToMinutes(t.startTime), timeToMinutes(t.endTime)]);

    let freeIntervals = subtractBusy(freeFromAvailability, classBusy);
    freeIntervals = subtractBusy(freeIntervals, acceptedBusy);

    for (const task of sortedTasks) {
      if (placedIds.has(task.id)) continue;
      if (task.deadline && dateKey > task.deadline) continue;

      for (let i = 0; i < freeIntervals.length; i++) {
        const [fs, fe] = freeIntervals[i];
        if (fe - fs >= task.durationMinutes) {
          const end = fs + task.durationMinutes;
          placed.push({ taskId: task.id, date: dateKey, startTime: minutesToTime(fs), endTime: minutesToTime(end) });
          placedIds.add(task.id);
          freeIntervals[i] = [end, fe];
          break;
        }
      }
    }
  }

  const unplacedTaskIds = sortedTasks.filter((t) => !placedIds.has(t.id)).map((t) => t.id);
  return { placed, unplacedTaskIds };
}
