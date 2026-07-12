"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";

type Parent = {
  id: string;
  name: string;
  email: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  children: { id: string; name: string }[];
};

export default function AdminParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);

  async function load() {
    const res = await fetch("/api/admin/parents");
    setParents(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: "APPROVED" | "REJECTED") {
    await fetch(`/api/admin/parents/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const pending = parents.filter((p) => p.approvalStatus === "PENDING");
  const decided = parents.filter((p) => p.approvalStatus !== "PENDING");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Parent requests</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Pending approval</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {p.name} <span className="font-normal text-slate-500">({p.email})</span>
                  </p>
                  <p className="text-slate-500">
                    Wants to view: {p.children.length ? p.children.map((c) => c.name).join(", ") : "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setStatus(p.id, "APPROVED")}>Approve</Button>
                  <Button variant="danger" onClick={() => setStatus(p.id, "REJECTED")}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">All parents</h2>
        {decided.length === 0 ? (
          <p className="text-sm text-slate-500">No decided requests yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Children</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {decided.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2">
                    {p.name}
                    <br />
                    <span className="text-xs text-slate-500">{p.email}</span>
                  </td>
                  <td className="py-2">{p.children.map((c) => c.name).join(", ") || "—"}</td>
                  <td className="py-2">
                    <Badge tone={p.approvalStatus === "APPROVED" ? "success" : "danger"}>{p.approvalStatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
