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
