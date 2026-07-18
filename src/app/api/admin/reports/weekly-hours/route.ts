import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, Font, type DocumentProps } from "@react-pdf/renderer";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { requireAdmin } from "@/lib/api-auth";
import { getWeekRange, formatTimeRange12h, durationHours } from "@/lib/date-utils";
import { WeeklyReportDocument, type StudentReportRow } from "@/lib/weekly-report-pdf";
import { CJK_FONT_BASE64 } from "@/lib/cjk-font-data";
import type { ClassSessionDoc, WithId } from "@/lib/types";

// The admin's own account, used to test the join/reminder flow as a
// "student" — never a real student, so it's excluded from hour reports.
const EXCLUDED_STUDENT_EMAIL = "moazzamali.softdev@gmail.com";

// Helvetica (the PDF standard font react-pdf defaults to) only covers
// Latin-1 — a Chinese student name silently renders as garbage glyphs
// without this. CJK_FONT_BASE64 is a generated constant (see
// scripts/generate-cjk-font-data.ts) rather than a bundled binary file,
// since Turbopack has no loader for raw .woff assets referenced from a
// server route.
const CJK_FONT_FAMILY = "ReportCJK";
let cjkFontRegistered = false;

function registerCjkFontOnce() {
  if (cjkFontRegistered) return;
  Font.register({ family: CJK_FONT_FAMILY, src: `data:font/woff;base64,${CJK_FONT_BASE64}` });
  cjkFontRegistered = true;
}

export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const dateParam = new URL(request.url).searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Provide a valid date (YYYY-MM-DD)." }, { status: 400 });
  }

  const { startKey, endKey } = getWeekRange(dateParam);
  const db = adminDb();

  const [sessionsSnap, studentsSnap] = await Promise.all([
    db.collection(COLLECTIONS.classSessions).where("date", ">=", startKey).where("date", "<=", endKey).get(),
    db.collection(COLLECTIONS.users).where("role", "==", "STUDENT").get(),
  ]);

  const studentById = new Map(studentsSnap.docs.map((d) => [d.id, d.data()]));
  const excludedId = studentsSnap.docs.find(
    (d) => (d.data().email as string | undefined)?.toLowerCase() === EXCLUDED_STUDENT_EMAIL,
  )?.id;

  const sessions = sessionsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as WithId<ClassSessionDoc>)
    .filter((s) => s.studentId !== excludedId);

  const byStudent = new Map<string, WithId<ClassSessionDoc>[]>();
  for (const s of sessions) {
    const list = byStudent.get(s.studentId) ?? [];
    list.push(s);
    byStudent.set(s.studentId, list);
  }

  const students: StudentReportRow[] = [...byStudent.entries()]
    .map(([studentId, classes]) => {
      const student = studentById.get(studentId);
      const sorted = [...classes].sort(
        (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
      );
      const classRows = sorted.map((c) => ({
        dateLabel: new Date(c.date).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        timeLabel: formatTimeRange12h(c.startTime, c.endTime),
        hours: durationHours(c.startTime, c.endTime),
      }));
      const totalHours = classRows.reduce((sum, c) => sum + c.hours, 0);
      return {
        name: (student?.name as string | undefined) ?? "Unknown",
        rollNumber: (student?.rollNumber as string | null | undefined) ?? null,
        className: (student?.className as string | null | undefined) ?? null,
        classes: classRows,
        totalHours,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const grandTotalHours = students.reduce((sum, s) => sum + s.totalHours, 0);

  const rangeLabel = `${new Date(startKey).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} – ${new Date(endKey).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const identityText = students.map((s) => [s.name, s.rollNumber, s.className].filter(Boolean).join("")).join("");
  const hasNonLatin = [...identityText].some((ch) => ch.charCodeAt(0) > 255);

  let unicodeFontFamily: string | null = null;
  if (hasNonLatin) {
    registerCjkFontOnce();
    unicodeFontFamily = CJK_FONT_FAMILY;
  }

  const buffer = await renderToBuffer(
    createElement(WeeklyReportDocument, {
      rangeLabel,
      students,
      grandTotalHours,
      unicodeFontFamily,
    }) as ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="weekly-report-${startKey}-to-${endKey}.pdf"`,
    },
  });
}
