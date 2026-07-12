"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";
import { DAYS } from "@/lib/constants";

type ClassSession = {
  id: string;
  dayOfWeek: number;
  subject: string;
  teacher: string | null;
  room: string | null;
  startTime: string;
  endTime: string;
};

const emptyForm = { dayOfWeek: 1, subject: "", teacher: "", room: "", startTime: "09:00", endTime: "09:45" };

export default function AdminTimetablePage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/timetable");
    setSessions(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dayOfWeek: Number(form.dayOfWeek) }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create entry.");
      return;
    }

    setForm(emptyForm);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/timetable/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Timetable</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add class</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <Label>Day</Label>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.dayOfWeek}
              onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Subject</Label>
            <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <Label>Teacher</Label>
            <Input value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} />
          </div>
          <div>
            <Label>Room</Label>
            <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
          </div>
          <div>
            <Label>Start time</Label>
            <Input
              type="time"
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div>
            <Label>End time</Label>
            <Input
              type="time"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex items-end gap-3 sm:col-span-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add class"}
            </Button>
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {DAYS.map((day, idx) => {
          const daySessions = sessions.filter((s) => s.dayOfWeek === idx);
          if (daySessions.length === 0) return null;
          return (
            <Card key={day}>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">{day}</h3>
              <div className="space-y-2">
                {daySessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">{s.startTime}-{s.endTime}</span> — {s.subject}
                      {s.teacher ? ` · ${s.teacher}` : ""}
                      {s.room ? ` · ${s.room}` : ""}
                    </span>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {sessions.length === 0 && <p className="text-sm text-slate-500">No timetable entries yet.</p>}
      </div>
    </div>
  );
}
