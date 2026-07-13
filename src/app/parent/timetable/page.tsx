"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChildren, ChildSwitcher } from "@/components/child-switcher";
import { Badge, Card } from "@/components/ui";

type ClassSession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  classLink: string | null;
  status: "scheduled" | "taken";
};

function TimetableList() {
  const searchParams = useSearchParams();
  const children = useChildren();
  const childId = searchParams.get("child") ?? children?.[0]?.id;
  const [sessions, setSessions] = useState<ClassSession[] | null>(null);

  useEffect(() => {
    if (!childId) return;
    setSessions(null);
    fetch(`/api/timetable?child=${childId}`)
      .then((res) => res.json())
      .then(setSessions);
  }, [childId]);

  if (!children) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <ChildSwitcher students={children} basePath="/parent/timetable" />
      {!sessions ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-500">No classes scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{new Date(s.date).toDateString()}</p>
                <p className="text-sm text-slate-500">
                  {s.startTime}-{s.endTime}
                  {s.classLink ? ` · ${s.classLink}` : ""}
                </p>
              </div>
              <Badge tone={s.status === "taken" ? "success" : "default"}>{s.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParentTimetablePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Timetable</h1>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
        <TimetableList />
      </Suspense>
    </div>
  );
}
