"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChildren, ChildSwitcher } from "@/components/child-switcher";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { CalendarIcon } from "@/components/icons";
import { formatTimeRange12h } from "@/lib/date-utils";

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

  if (!children) return <Skeleton className="h-9 w-64" />;

  return (
    <div className="space-y-6">
      <ChildSwitcher students={children} basePath="/parent/timetable" />
      {!sessions ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarIcon />} title="No classes scheduled yet" />
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">{new Date(s.date).toDateString()}</p>
                <p className="text-sm text-slate-500">{formatTimeRange12h(s.startTime, s.endTime)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={s.status === "taken" ? "success" : "default"}>{s.status}</Badge>
                {s.classLink && (
                  <a href={s.classLink} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                    Link
                  </a>
                )}
              </div>
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
      <Suspense fallback={<Skeleton className="h-9 w-64" />}>
        <TimetableList />
      </Suspense>
    </div>
  );
}
