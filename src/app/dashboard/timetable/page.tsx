"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorText, Input } from "@/components/ui";

type ClassSession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  classLink: string | null;
  status: "scheduled" | "taken";
};

type RescheduleRequest = {
  id: string;
  classSessionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export default function StudentTimetablePage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [form, setForm] = useState({ newDate: "", newStartTime: "", newEndTime: "" });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    const [sessionsRes, requestsRes] = await Promise.all([
      fetch("/api/timetable"),
      fetch("/api/reschedule-requests"),
    ]);
    setSessions(await sessionsRes.json());
    setRequests(await requestsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleJoin(s: ClassSession) {
    if (s.classLink) window.open(s.classLink, "_blank");
    await fetch(`/api/timetable/${s.id}/take`, { method: "POST" });
    load();
  }

  async function submitReschedule(classSessionId: string) {
    setError(null);
    setStatus(null);
    const res = await fetch("/api/reschedule-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSessionId, ...form }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to send request.");
      return;
    }
    setStatus("Reschedule request sent — waiting on admin approval.");
    setRescheduling(null);
    setForm({ newDate: "", newStartTime: "", newEndTime: "" });
    load();
  }

  const pendingRequestByClassId = new Map(
    requests.filter((r) => r.status === "PENDING").map((r) => [r.classSessionId, r]),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Your timetable</h1>
      {status && <p className="text-sm text-emerald-600">{status}</p>}
      <div className="space-y-3">
        {sessions.map((s) => {
          const pending = pendingRequestByClassId.get(s.id);
          return (
            <Card key={s.id}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{new Date(s.date).toDateString()}</p>
                  <p className="text-sm text-slate-500">
                    {s.startTime}-{s.endTime}
                  </p>
                  {pending && (
                    <Badge tone="warning" className="mt-1">
                      Reschedule pending approval
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.status === "taken" ? "success" : "default"}>{s.status}</Badge>
                  {s.classLink && (
                    <Button variant="secondary" onClick={() => handleJoin(s)}>
                      Join class
                    </Button>
                  )}
                  {!pending && (
                    <button
                      onClick={() => setRescheduling(rescheduling === s.id ? null : s.id)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Reschedule
                    </button>
                  )}
                </div>
              </div>

              {rescheduling === s.id && (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                  <Input
                    type="date"
                    value={form.newDate}
                    onChange={(e) => setForm({ ...form, newDate: e.target.value })}
                  />
                  <Input
                    type="time"
                    value={form.newStartTime}
                    onChange={(e) => setForm({ ...form, newStartTime: e.target.value })}
                  />
                  <Input
                    type="time"
                    value={form.newEndTime}
                    onChange={(e) => setForm({ ...form, newEndTime: e.target.value })}
                  />
                  <div className="col-span-3 flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={() => submitReschedule(s.id)}
                      disabled={!form.newDate || !form.newStartTime || !form.newEndTime}
                    >
                      Send request
                    </Button>
                    <ErrorText>{error}</ErrorText>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {sessions.length === 0 && <p className="text-sm text-slate-500">No classes scheduled yet.</p>}
      </div>
    </div>
  );
}
