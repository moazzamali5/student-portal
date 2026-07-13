"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { CalendarIcon } from "@/components/icons";
import { joinClass } from "@/lib/join-class";
import { useToast } from "@/components/toast";
import { formatTimeRange12h } from "@/lib/date-utils";

export type TodayClassSession = {
  id: string;
  startTime: string;
  endTime: string;
  classLink: string | null;
  status: "scheduled" | "taken";
};

function nowTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function minutesUntil(time: string, current: string) {
  const [h, m] = time.split(":").map(Number);
  const [ch, cm] = current.split(":").map(Number);
  return h * 60 + m - (ch * 60 + cm);
}

function JoinButton({
  session,
  tone = "compact",
}: {
  session: TodayClassSession;
  tone?: "hero" | "compact";
}) {
  const router = useRouter();
  const toast = useToast();
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    setJoining(true);
    const result = await joinClass(session.id, session.classLink);
    setJoining(false);
    if (!result.ok) {
      toast.show(result.error ?? "Couldn't mark this as taken.", "error");
    } else {
      toast.show("Marked as taken — enjoy the class!", "success");
    }
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      loading={joining}
      onClick={handleJoin}
      className={tone === "hero" ? "bg-white/15 text-white hover:bg-white/25" : undefined}
    >
      Join class
    </Button>
  );
}

export function TodayClassesCard({
  sessions,
  timetableHref = "/dashboard/timetable",
}: {
  sessions: TodayClassSession[];
  timetableHref?: string;
}) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setCurrent(nowTimeStr()), 30000);
    return () => clearInterval(id);
  }, []);

  const nowTime = current ?? nowTimeStr();
  const featured = sessions.find(
    (s) => s.status === "scheduled" && nowTime >= s.startTime && nowTime <= s.endTime,
  );
  const soon = featured
    ? undefined
    : sessions.find(
        (s) => s.status === "scheduled" && minutesUntil(s.startTime, nowTime) > 0 && minutesUntil(s.startTime, nowTime) <= 15,
      );
  const hero = featured ?? soon;
  const rest = sessions.filter((s) => s.id !== hero?.id);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-sm font-semibold text-slate-900">Today&apos;s classes</h2>
        <a href={timetableHref} className="text-sm text-indigo-600 hover:underline">
          Full timetable →
        </a>
      </div>

      <div className="p-5 space-y-2">
        {hero && (
          <div className="animate-fade-up rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="mb-2 inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  {featured ? "Live now" : "Starting soon"}
                </span>
                <p className="text-lg font-semibold">{formatTimeRange12h(hero.startTime, hero.endTime)}</p>
              </div>
              {hero.classLink && <JoinButton session={hero} tone="hero" />}
            </div>
          </div>
        )}

        {rest.length === 0 && !hero ? (
          <EmptyState
            icon={<CalendarIcon />}
            title="No classes today"
            description="Check the full timetable for what's coming up."
            action={
              <a href={timetableHref} className="text-sm font-medium text-indigo-600 hover:underline">
                View full timetable
              </a>
            }
          />
        ) : (
          rest.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <span className="font-medium">{formatTimeRange12h(s.startTime, s.endTime)}</span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={s.status === "taken" ? "success" : "default"}>{s.status}</Badge>
                {s.status === "scheduled" && s.classLink && <JoinButton session={s} />}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
