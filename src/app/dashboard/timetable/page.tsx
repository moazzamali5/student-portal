"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorText, Input, Skeleton } from "@/components/ui";
import { CalendarIcon } from "@/components/icons";
import { joinClass } from "@/lib/join-class";
import { useToast } from "@/components/toast";

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
  const toast = useToast();
  const [sessions, setSessions] = useState<ClassSession[] | null>(null);
  const [requests, setRequests] = useState<RescheduleRequest[] | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [form, setForm] = useState({ newDate: "", newStartTime: "", newEndTime: "" });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

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
    setJoiningId(s.id);
    const result = await joinClass(s.id, s.classLink);
    setJoiningId(null);
    if (!result.ok) {
      toast.show(result.error ?? "Couldn't mark this as taken.", "error");
    } else {
      toast.show("Marked as taken — enjoy the class!", "success");
    }
    load();
  }

  async function submitReschedule(classSessionId: string) {
    setError(null);
    setSending(true);
    const res = await fetch("/api/reschedule-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classSessionId, ...form }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to send request.");
      return;
    }
    toast.show("Reschedule request sent — waiting on admin approval.", "success");
    setRescheduling(null);
    setForm({ newDate: "", newStartTime: "", newEndTime: "" });
    load();
  }

  const pendingRequestByClassId = new Map(
    (requests ?? []).filter((r) => r.status === "PENDING").map((r) => [r.classSessionId, r]),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Your timetable</h1>
      <div className="space-y-3">
        {sessions === null ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : sessions.length === 0 ? (
          <Card>
            <EmptyState icon={<CalendarIcon />} title="No classes scheduled yet" />
          </Card>
        ) : (
          sessions.map((s, i) => {
            const pending = pendingRequestByClassId.get(s.id);
            return (
              <Card key={s.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
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
                    {s.classLink && s.status === "scheduled" && (
                      <Button variant="secondary" loading={joiningId === s.id} onClick={() => handleJoin(s)}>
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
                        loading={sending}
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
          })
        )}
      </div>
    </div>
  );
}
