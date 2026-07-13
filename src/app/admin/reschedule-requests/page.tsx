"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorText, Skeleton } from "@/components/ui";
import { ClipboardIcon } from "@/components/icons";

type RescheduleRequest = {
  id: string;
  studentName: string;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  newDate: string;
  newStartTime: string;
  newEndTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export default function AdminRescheduleRequestsPage() {
  const [requests, setRequests] = useState<RescheduleRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/reschedule-requests");
    setRequests(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    const res = await fetch(`/api/reschedule-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to update request.");
      return;
    }
    load();
  }

  const pending = (requests ?? []).filter((r) => r.status === "PENDING");
  const decided = (requests ?? []).filter((r) => r.status !== "PENDING");

  if (requests === null) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Reschedule requests</h1>
        <Card>
          <Skeleton className="h-20 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-20 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Reschedule requests</h1>
      <ErrorText>{error}</ErrorText>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Pending</h2>
        {pending.length === 0 ? (
          <EmptyState icon={<ClipboardIcon />} title="No pending requests" />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{r.studentName}</p>
                  <p className="text-slate-600">
                    {new Date(r.originalDate).toDateString()} {r.originalStartTime}-{r.originalEndTime} →{" "}
                    {new Date(r.newDate).toDateString()} {r.newStartTime}-{r.newEndTime}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => decide(r.id, "APPROVED")}>Approve</Button>
                  <Button variant="danger" onClick={() => decide(r.id, "REJECTED")}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Decided</h2>
        {decided.length === 0 ? (
          <EmptyState icon={<ClipboardIcon />} title="Nothing decided yet" />
        ) : (
          <div className="space-y-2">
            {decided.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="text-slate-900">
                  {r.studentName}: {new Date(r.originalDate).toDateString()} {r.originalStartTime}-
                  {r.originalEndTime} → {new Date(r.newDate).toDateString()} {r.newStartTime}-{r.newEndTime}
                </span>
                <Badge tone={r.status === "APPROVED" ? "success" : "danger"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
