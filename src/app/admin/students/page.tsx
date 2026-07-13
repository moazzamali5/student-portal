"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorText } from "@/components/ui";

type Student = {
  id: string;
  name: string;
  email: string;
  rollNumber: string | null;
  className: string | null;
  createdAt: string;
  submissionCount: number;
  articleReadCount: number;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/students")
      .then((res) => res.json())
      .then(setStudents);
  }, []);

  async function sendTestEmail() {
    setTestEmailStatus("Sending...");
    const res = await fetch("/api/admin/test-email", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setTestEmailStatus(res.ok ? "Test email sent — check your inbox." : data.error ?? "Failed to send.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Students</h1>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={sendTestEmail}>
            Send test email
          </Button>
          {testEmailStatus && <ErrorText>{testEmailStatus}</ErrorText>}
        </div>
      </div>

      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2">Name</th>
              <th className="pb-2">Roll / Class</th>
              <th className="pb-2">Homework submitted</th>
              <th className="pb-2">Articles read</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 text-slate-900">
                  {s.name}
                  <br />
                  <span className="text-xs text-slate-500">{s.email}</span>
                </td>
                <td className="py-2 text-slate-900">
                  {s.rollNumber ?? "—"} {s.className ? `/ ${s.className}` : ""}
                </td>
                <td className="py-2 text-slate-900">{s.submissionCount}</td>
                <td className="py-2 text-slate-900">{s.articleReadCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-sm text-slate-500">No students registered yet.</p>}
      </Card>
    </div>
  );
}
