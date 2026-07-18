// Deliberately not toISOString() — that converts to UTC, which can silently
// shift the date by a day relative to local Date methods (getDay, getDate,
// setDate) used elsewhere for "today"/"next Tuesday" style calculations
// (e.g. local midnight in a UTC+5 timezone is still the previous day in
// UTC). Building the string from local components keeps everything that
// stores/matches on a plain "YYYY-MM-DD" key self-consistent.
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "Today" / "Tomorrow" for the two closest days, then a short weekday+date
// label — used by the admin all-students agenda to group entries by date
// without repeating the full date string for every nearby entry.
export function formatAgendaDateLabel(dateKey: string, todayKey: string): string {
  if (dateKey === todayKey) return "Today";

  const [ty, tm, td] = todayKey.split("-").map(Number);
  const tomorrow = new Date(ty, tm - 1, td + 1);
  if (dateKey === toLocalDateKey(tomorrow)) return "Tomorrow";

  const [y, m, day] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// Stored/edited as 24-hour "HH:MM" (native <input type="time"> values are
// always 24h regardless of locale) but displayed as 12-hour with AM/PM
// everywhere a user just reads a time rather than editing it.
export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatTimeRange12h(start: string, end: string): string {
  return `${formatTime12h(start)} - ${formatTime12h(end)}`;
}

export function durationHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

// Monday-Sunday week containing the given date — used for the admin's
// weekly-hours report so picking any day of the week produces the same
// report.
export function getWeekRange(dateKey: string): { startKey: string; endKey: string } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(y, m - 1, d + diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { startKey: toLocalDateKey(monday), endKey: toLocalDateKey(sunday) };
}
