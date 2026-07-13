"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, ErrorText, Input, Label } from "@/components/ui";
import { DAYS_SHORT } from "@/lib/constants";

type Availability = { id: string; dayOfWeek: number; startTime: string; endTime: string };
type Task = {
  id: string;
  title: string;
  durationMinutes: number;
  deadline: string | null;
  status: "unscheduled" | "scheduled" | "done";
};
type ScheduledTask = {
  id: string;
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "proposed" | "accepted";
  title?: string;
};

const emptyAvailability = { dayOfWeek: 1, startTime: "16:00", endTime: "18:00" };
const emptyTask = { title: "", durationMinutes: 30, deadline: "", notes: "" };

export default function PlannerPage() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailability);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [unplacedCount, setUnplacedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);

  async function load() {
    const res = await fetch("/api/planner");
    const data = await res.json();
    setAvailability(data.availability);
    setTasks(data.tasks);
    setScheduledTasks(data.scheduledTasks);
  }

  useEffect(() => {
    load();
  }, []);

  async function addAvailability(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/planner/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(availabilityForm),
    });
    setAvailabilityForm(emptyAvailability);
    load();
  }

  async function deleteAvailability(id: string) {
    await fetch(`/api/planner/availability/${id}`, { method: "DELETE" });
    load();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/planner/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskForm),
    });
    setTaskForm(emptyTask);
    load();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/planner/tasks/${id}`, { method: "DELETE" });
    load();
  }

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/planner/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate schedule.");
      setUnplacedCount(data.unplacedTaskIds.length);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate schedule.");
    } finally {
      setGenerating(false);
    }
  }

  async function accept() {
    setError(null);
    setAccepting(true);
    try {
      const res = await fetch("/api/planner/accept", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to accept schedule.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept schedule.");
    } finally {
      setAccepting(false);
    }
  }

  const taskTitleById = new Map(tasks.map((t) => [t.id, t.title]));
  const proposed = scheduledTasks.filter((s) => s.status === "proposed");
  const accepted = scheduledTasks.filter((s) => s.status === "accepted");
  const byDate = (list: ScheduledTask[]) => {
    const map = new Map<string, ScheduledTask[]>();
    for (const s of list) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Time management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tell us when you&apos;re free and what you need to get done — we&apos;ll fit it around your class
          timetable and remind you 30 minutes before each task once you accept the plan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Your free time</h2>
          <form onSubmit={addAvailability} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <select
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                value={availabilityForm.dayOfWeek}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: Number(e.target.value) })}
              >
                {DAYS_SHORT.map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
              <Input
                type="time"
                value={availabilityForm.startTime}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })}
              />
              <Input
                type="time"
                value={availabilityForm.endTime}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })}
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full">
              Add free time block
            </Button>
          </form>
          <div className="mt-3 space-y-1.5">
            {availability.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="text-slate-900">
                  {DAYS_SHORT[a.dayOfWeek]} {a.startTime}-{a.endTime}
                </span>
                <button onClick={() => deleteAvailability(a.id)} className="text-xs text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            ))}
            {availability.length === 0 && <p className="text-sm text-slate-500">No free time blocks added yet.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Things to do</h2>
          <form onSubmit={addTask} className="space-y-3">
            <Input
              placeholder="Task title"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Duration (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={taskForm.durationMinutes}
                  onChange={(e) => setTaskForm({ ...taskForm, durationMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Deadline (optional)</Label>
                <Input
                  type="date"
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" variant="secondary" className="w-full">
              Add task
            </Button>
          </form>
          <div className="mt-3 space-y-1.5">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="text-slate-900">
                  {t.title} <span className="text-slate-500">({t.durationMinutes}m)</span>
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone={t.status === "done" ? "success" : t.status === "scheduled" ? "warning" : "default"}>
                    {t.status}
                  </Badge>
                  <button onClick={() => deleteTask(t.id)} className="text-xs text-red-600 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks added yet.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Schedule</h2>
          <div className="flex gap-2">
            <Button variant="secondary" loading={generating} onClick={generate}>
              Generate schedule
            </Button>
            {proposed.length > 0 && (
              <Button loading={accepting} onClick={accept}>
                Accept schedule
              </Button>
            )}
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
        {unplacedCount > 0 && (
          <p className="mt-2 text-sm text-amber-600">
            {unplacedCount} task(s) couldn&apos;t be fit into your free time — try adding more availability.
          </p>
        )}

        {proposed.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Proposed (not yet accepted)</p>
            <div className="space-y-2">
              {byDate(proposed).map(([date, items]) => (
                <div key={date} className="text-sm">
                  <span className="font-medium text-slate-900">{new Date(date).toLocaleDateString()}</span>
                  <ul className="ml-4 list-disc text-slate-600">
                    {items.map((s) => (
                      <li key={s.id}>
                        {s.startTime}-{s.endTime}: {taskTitleById.get(s.taskId) ?? "Task"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Accepted</p>
          {accepted.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing accepted yet.</p>
          ) : (
            <div className="space-y-2">
              {byDate(accepted).map(([date, items]) => (
                <div key={date} className="text-sm">
                  <span className="font-medium text-slate-900">{new Date(date).toLocaleDateString()}</span>
                  <ul className="ml-4 list-disc text-slate-600">
                    {items.map((s) => (
                      <li key={s.id}>
                        {s.startTime}-{s.endTime}: {taskTitleById.get(s.taskId) ?? "Task"}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
