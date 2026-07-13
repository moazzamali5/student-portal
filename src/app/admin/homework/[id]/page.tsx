"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";

type Row = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  submission: { id: string; fileType: string; submittedAt: string } | null;
};

export default function AdminHomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [homework, setHomework] = useState<{ title: string; subject: string | null; dueDate: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/homework/${id}/submissions`)
      .then((res) => res.json())
      .then((data) => {
        setHomework(data.homework);
        setRows(data.rows);
      });
  }, [id]);

  if (!homework) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/homework" className="text-sm text-indigo-600 hover:underline">
          ← Back to homework
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{homework.title}</h1>
        <p className="text-sm text-slate-600">
          {homework.subject ? `${homework.subject} · ` : ""}Due {new Date(homework.dueDate).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2">Student</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Submitted</th>
              <th className="pb-2">File</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId} className="border-b border-slate-100 last:border-0">
                <td className="py-2">
                  {r.studentName}
                  <br />
                  <span className="text-xs text-slate-500">{r.studentEmail}</span>
                </td>
                <td className="py-2">
                  {r.submission ? (
                    <Badge tone="success">Submitted</Badge>
                  ) : (
                    <Badge tone="warning">Pending</Badge>
                  )}
                </td>
                <td className="py-2">
                  {r.submission ? new Date(r.submission.submittedAt).toLocaleString() : "—"}
                </td>
                <td className="py-2">
                  {r.submission ? (
                    <a
                      href={`/api/homework/submissions/${r.submission.id}/download`}
                      target="_blank"
                      className="text-indigo-600 hover:underline"
                    >
                      View {r.submission.fileType.toUpperCase()}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
