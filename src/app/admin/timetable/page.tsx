"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorText, Input, Label, Textarea } from "@/components/ui";
import { StudentPicker } from "@/components/student-picker";

type ParsedLine = {
  raw: string;
  date: string | null;
  dayLabel: string | null;
  startTime: string | null;
  endTime: string | null;
  error: string | null;
};

type ClassSession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  classLink: string | null;
  status: "scheduled" | "taken";
};

type Student = { id: string; name: string; rollNumber: string | null; className: string | null };

export default function AdminTimetablePage() {
  const [text, setText] = useState("");
  const [classLink, setClassLink] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [viewStudentId, setViewStudentId] = useState("");
  const [viewSessions, setViewSessions] = useState<ClassSession[]>([]);

  useEffect(() => {
    fetch("/api/students-directory")
      .then((res) => res.json())
      .then(setStudents);
  }, []);

  async function loadViewSessions(studentId: string) {
    if (!studentId) {
      setViewSessions([]);
      return;
    }
    const res = await fetch(`/api/timetable?student=${studentId}`);
    setViewSessions(await res.json());
  }

  useEffect(() => {
    loadViewSessions(viewStudentId);
  }, [viewStudentId]);

  async function handleParse() {
    setError(null);
    setSaveStatus(null);
    setParsing(true);
    try {
      const res = await fetch("/api/timetable/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to parse.");
      setParsedLines(data.lines);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse.");
    } finally {
      setParsing(false);
    }
  }

  function updateLine(idx: number, patch: Partial<ParsedLine>) {
    setParsedLines((lines) => lines.map((l, i) => (i === idx ? { ...l, ...patch, error: null } : l)));
  }

  function removeLine(idx: number) {
    setParsedLines((lines) => lines.filter((_, i) => i !== idx));
  }

  async function handleConfirm() {
    setError(null);
    setSaveStatus(null);
    if (studentIds.length === 0) {
      setError("Select at least one student.");
      return;
    }
    const entries = parsedLines
      .filter((l) => l.date && l.startTime && l.endTime)
      .map((l) => ({ date: l.date!, startTime: l.startTime!, endTime: l.endTime!, classLink }));
    if (entries.length === 0) {
      setError("No valid entries to save — fix or remove the rows with errors first.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/timetable/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds, entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setSaveStatus(`Saved ${data.created} class(es) and emailed the student(s).`);
      setText("");
      setClassLink("");
      setParsedLines([]);
      const savedForViewedStudent = studentIds.includes(viewStudentId);
      setStudentIds([]);
      if (savedForViewedStudent) loadViewSessions(viewStudentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    loadViewSessions(viewStudentId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Timetable</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Enter this week&apos;s classes</h2>
        <p className="mb-3 text-sm text-slate-600">
          One class per line, e.g. <code>Tuesday: 8 - 10 pm</code> or <code>Friday 10 am</code>. Parse it first,
          check the result, then confirm.
        </p>
        <Textarea
          rows={5}
          placeholder={"Tuesday: 8 - 10 pm\nFriday 10 am\nSaturday 10 am\nSunday 11am-1 pm"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={handleParse} disabled={parsing || !text.trim()}>
            {parsing ? "Parsing..." : "Parse"}
          </Button>
        </div>

        {parsedLines.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Review — edit anything that looks wrong
            </p>
            {parsedLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
                <span className="col-span-3 truncate text-slate-500" title={line.raw}>
                  {line.raw}
                </span>
                <div className="col-span-2">
                  <Input
                    type="date"
                    value={line.date ?? ""}
                    onChange={(e) => updateLine(idx, { date: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="time"
                    value={line.startTime ?? ""}
                    onChange={(e) => updateLine(idx, { startTime: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="time"
                    value={line.endTime ?? ""}
                    onChange={(e) => updateLine(idx, { endTime: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  {line.error ? <ErrorText>{line.error}</ErrorText> : <Badge tone="success">OK</Badge>}
                </div>
                <button onClick={() => removeLine(idx)} className="col-span-1 text-xs text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ))}

            <div className="pt-2">
              <Label>Class link (same link used for all these classes)</Label>
              <Input
                type="url"
                placeholder="https://meet.google.com/..."
                value={classLink}
                onChange={(e) => setClassLink(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <Label>Assign to</Label>
              <StudentPicker selected={studentIds} onChange={setStudentIds} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" onClick={handleConfirm} disabled={saving}>
                {saving ? "Saving..." : "Confirm & save"}
              </Button>
              <ErrorText>{error}</ErrorText>
            </div>
          </div>
        )}
        {saveStatus && <p className="mt-3 text-sm text-emerald-600">{saveStatus}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">View / manage a student&apos;s timetable</h2>
        <select
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={viewStudentId}
          onChange={(e) => setViewStudentId(e.target.value)}
        >
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {viewStudentId && (
          <div className="mt-3 space-y-2">
            {viewSessions.length === 0 ? (
              <p className="text-sm text-slate-500">No classes scheduled.</p>
            ) : (
              viewSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <span>
                    {new Date(s.date).toDateString()} · {s.startTime}-{s.endTime}
                  </span>
                  <div className="flex items-center gap-3">
                    <Badge tone={s.status === "taken" ? "success" : "default"}>{s.status}</Badge>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
