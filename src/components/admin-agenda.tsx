"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { CalendarIcon } from "@/components/icons";
import { toLocalDateKey, formatAgendaDateLabel } from "@/lib/date-utils";
import type { AdminAgendaEntry } from "@/app/api/timetable/route";

export function AdminAgendaView() {
  const [entries, setEntries] = useState<AdminAgendaEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/timetable?all=1")
      .then((res) => res.json())
      .then(setEntries);
  }, []);

  if (entries === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState icon={<CalendarIcon />} title="No upcoming classes for any student" />
      </Card>
    );
  }

  const todayKey = toLocalDateKey(new Date());
  const groups = new Map<string, AdminAgendaEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.date) ?? [];
    list.push(entry);
    groups.set(entry.date, list);
  }

  let rowIndex = 0;

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([date, dayEntries]) => (
        <div key={date} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {formatAgendaDateLabel(date, todayKey)}
          </h3>
          {dayEntries.map((entry) => {
            const delay = rowIndex++ * 40;
            return (
              <Card
                key={entry.id}
                className="animate-fade-up flex items-center justify-between gap-4"
                style={{ animationDelay: `${delay}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{entry.studentName}</p>
                    <p className="text-sm text-slate-500">
                      {entry.startTime}-{entry.endTime}
                      {(entry.rollNumber || entry.className) && (
                        <span className="ml-2 text-slate-400">
                          {[entry.rollNumber, entry.className].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={entry.status === "taken" ? "success" : "default"}>{entry.status}</Badge>
                  {entry.classLink && (
                    <a
                      href={entry.classLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Link
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
