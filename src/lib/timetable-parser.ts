import { DAYS } from "@/lib/constants";
import { toLocalDateKey } from "@/lib/date-utils";

const DAY_NAMES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

export type ParsedTimetableLine = {
  raw: string;
  date: string | null;
  dayLabel: string | null;
  startTime: string | null;
  endTime: string | null;
  error: string | null;
};

function nextOccurrence(dayOfWeek: number, today: Date): Date {
  const result = new Date(today);
  result.setHours(0, 0, 0, 0);
  const diff = (dayOfWeek - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + diff);
  return result;
}


type TimeToken = { hour: number; minute: number; meridiem: "am" | "pm" | null };

function parseTimeToken(token: string): TimeToken | null {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3] ? (m[3].toLowerCase() as "am" | "pm") : null;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, meridiem };
}

function to24Hour(hour: number, meridiem: "am" | "pm" | null): number {
  if (meridiem === "am") return hour === 12 ? 0 : hour;
  if (meridiem === "pm") return hour === 12 ? 12 : hour + 12;
  return hour;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Parses lines like "Tuesday: 8 - 10 pm", "Friday 10 am", "Sunday 11am-1 pm".
// Deliberately forgiving (AM/PM inference on ranges, 1-hour default for a
// bare single time) — the caller shows each parsed row back to the admin as
// editable fields before saving, so an imperfect guess here is recoverable,
// not silently wrong.
export function parseTimetableLine(raw: string, today: Date): ParsedTimetableLine {
  const line = raw.trim();
  if (!line) return { raw, date: null, dayLabel: null, startTime: null, endTime: null, error: "Empty line" };

  const dayMatch = line.match(/^([a-zA-Z]+)/);
  if (!dayMatch) {
    return { raw, date: null, dayLabel: null, startTime: null, endTime: null, error: "Couldn't find a day name" };
  }
  const dayOfWeek = DAY_NAMES[dayMatch[1].toLowerCase()];
  if (dayOfWeek === undefined) {
    return {
      raw,
      date: null,
      dayLabel: null,
      startTime: null,
      endTime: null,
      error: `Unknown day "${dayMatch[1]}"`,
    };
  }
  const dayLabel = DAYS[dayOfWeek];

  const rest = line.slice(dayMatch[0].length).replace(/^[\s:,-]+/, "");
  const rangeMatch = rest.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const singleMatch = rangeMatch ? null : rest.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);

  if (!rangeMatch && !singleMatch) {
    return { raw, date: null, dayLabel, startTime: null, endTime: null, error: "Couldn't find a time" };
  }

  const startTok = parseTimeToken(rangeMatch ? rangeMatch[1] : singleMatch![1]);
  const endTok = rangeMatch ? parseTimeToken(rangeMatch[2]) : null;

  if (!startTok || (rangeMatch && !endTok)) {
    return { raw, date: null, dayLabel, startTime: null, endTime: null, error: "Couldn't parse the time" };
  }

  let startMeridiem = startTok.meridiem;
  let endMeridiem = endTok?.meridiem ?? null;
  if (endTok) {
    if (!startMeridiem && endMeridiem) startMeridiem = endMeridiem;
    if (!endMeridiem && startMeridiem) endMeridiem = startMeridiem;
  } else if (!startMeridiem) {
    startMeridiem = "am";
  }

  const startHour24 = to24Hour(startTok.hour, startMeridiem);
  const endHour24 = endTok ? to24Hour(endTok.hour, endMeridiem) : startHour24 + 1;
  const endMinute = endTok ? endTok.minute : startTok.minute;

  return {
    raw,
    date: toLocalDateKey(nextOccurrence(dayOfWeek, today)),
    dayLabel,
    startTime: formatTime(startHour24, startTok.minute),
    endTime: formatTime(endHour24, endMinute),
    error: null,
  };
}

export function parseTimetableText(text: string, today: Date = new Date()): ParsedTimetableLine[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => parseTimetableLine(line, today));
}
