"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorText, Input, Label, Textarea } from "@/components/ui";
import { CalendarIcon } from "@/components/icons";
import { formatTimeRange12h } from "@/lib/date-utils";
import { AdminAgendaView } from "@/components/admin-agenda";
import { useToast } from "@/components/toast";

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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminTimetablePage() {
  const toast = useToast();
  const [tab, setTab] = useState<"agenda" | "manage">("agenda");

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  const [text, setText] = useState("");
  const [classLink, setClassLink] = useState("");
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students-directory")
      .then((res) => res.json())
      .then(setStudents);
  }, []);

  async function loadSessions(id: string) {
    if (!id) {
      setSessions([]);
      return;
    }
    const res = await fetch(`/api/timetable?student=${id}`);
    setSessions(await res.json());
  }

  useEffect(() => {
    loadSessions(studentId);
  }, [studentId]);

  function selectStudent(id: string) {
    setStudentId(id);
    setText("");
    setClassLink("");
    setParsedLines([]);
    setError(null);
  }

  const selectedStudent = students.find((s) => s.id === studentId);

  async function handleParse() {
    setError(null);
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
    if (!studentId) {
      setError("Select a student first.");
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
        body: JSON.stringify({ studentIds: [studentId], entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      toast.show(`Saved ${data.created} class(es) and emailed ${selectedStudent?.name ?? "the student"}.`, "success");
      setText("");
      setClassLink("");
      setParsedLines([]);
      loadSessions(studentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    loadSessions(studentId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Timetable</h1>
        <div className="flex gap-2">
          <TabButton active={tab === "agenda"} onClick={() => setTab("agenda")}>
            All students
          </TabButton>
          <TabButton active={tab === "manage"} onClick={() => setTab("manage")}>
            Add classes
          </TabButton>
        </div>
      </div>

      {tab === "agenda" && <AdminAgendaView />}

      {tab === "manage" && (
        <>
          <Card>
            <Label>Student</Label>
            <select
              className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={studentId}
              onChange={(e) => selectStudent(e.target.value)}
            >
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Card>

          {studentId && (
            <>
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-slate-900">
                  {selectedStudent?.name}&apos;s current timetable
                </h2>
                {sessions.length === 0 ? (
                  <EmptyState icon={<CalendarIcon />} title="No classes scheduled yet" />
                ) : (
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="text-slate-900">
                          {new Date(s.date).toDateString()} · {formatTimeRange12h(s.startTime, s.endTime)}
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge tone={s.status === "taken" ? "success" : "default"}>{s.status}</Badge>
                          <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="mb-3 text-sm font-semibold text-slate-900">
                  Add {selectedStudent?.name}&apos;s schedule for the week
                </h2>
                <p className="mb-3 text-sm text-slate-600">
                  One class per line, e.g. <code>Tuesday: 8 - 10 pm</code> or <code>Friday 10 am</code>. Parse it
                  first, check the result, then confirm.
                </p>
                <Textarea
                  rows={5}
                  placeholder={"Tuesday: 8 - 10 pm\nFriday 10 am\nSaturday 10 am\nSunday 11am-1 pm"}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="mt-3 flex items-center gap-3">
                  <Button type="button" variant="secondary" loading={parsing} onClick={handleParse} disabled={!text.trim()}>
                    Parse
                  </Button>
                </div>

                {parsedLines.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Review — edit anything that looks wrong
                    </p>
                    {parsedLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm"
                      >
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
                        <button
                          onClick={() => removeLine(idx)}
                          className="col-span-1 text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}

                    <div className="pt-2">
                      <Label>Class link (used for all these classes)</Label>
                      <Input
                        type="url"
                        placeholder="https://meet.google.com/..."
                        value={classLink}
                        onChange={(e) => setClassLink(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button type="button" loading={saving} onClick={handleConfirm}>
                        Confirm & save
                      </Button>
                      <ErrorText>{error}</ErrorText>
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
