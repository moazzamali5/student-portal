"use client";

import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { UsersIcon } from "@/components/icons";
import { useToast } from "@/components/toast";

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
  const toast = useToast();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetch("/api/admin/students")
      .then((res) => res.json())
      .then(setStudents);
  }, []);

  async function sendTestEmail() {
    setSendingTest(true);
    const res = await fetch("/api/admin/test-email", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSendingTest(false);
    toast.show(res.ok ? "Test email sent — check your inbox." : data.error ?? "Failed to send.", res.ok ? "success" : "error");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Students</h1>
        <Button variant="secondary" loading={sendingTest} onClick={sendTestEmail}>
          Send test email
        </Button>
      </div>

      {students === null ? (
        <Card>
          <Skeleton className="h-40 w-full" />
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <EmptyState icon={<UsersIcon />} title="No students registered yet" />
        </Card>
      ) : (
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
        </Card>
      )}
    </div>
  );
}
