"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChildren, ChildSwitcher } from "@/components/child-switcher";
import { Badge, Card } from "@/components/ui";

type Homework = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  dueDate: string;
  submissions: { id: string; fileType: string; submittedAt: string }[];
};

function HomeworkList() {
  const searchParams = useSearchParams();
  const children = useChildren();
  const childId = searchParams.get("child") ?? children?.[0]?.id;
  const [items, setItems] = useState<Homework[] | null>(null);

  useEffect(() => {
    if (!childId) return;
    setItems(null);
    fetch(`/api/homework?child=${childId}`)
      .then((res) => res.json())
      .then(setItems);
  }, [childId]);

  if (!children) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <ChildSwitcher students={children} basePath="/parent/homework" />
      {!items ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">No homework assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((hw) => {
            const submission = hw.submissions[0];
            const overdue = !submission && new Date(hw.dueDate) < new Date();
            return (
              <Card key={hw.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">
                      {hw.title} <span className="text-sm font-normal text-slate-500">({hw.subject})</span>
                    </p>
                    {hw.description && <p className="mt-1 text-sm text-slate-600">{hw.description}</p>}
                    <p className="mt-1 text-sm text-slate-500">Due {new Date(hw.dueDate).toLocaleDateString()}</p>
                    {submission && (
                      <a
                        href={`/api/homework/submissions/${submission.id}/download`}
                        target="_blank"
                        className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
                      >
                        View submission ({submission.fileType.toUpperCase()})
                      </a>
                    )}
                  </div>
                  <Badge tone={submission ? "success" : overdue ? "danger" : "warning"}>
                    {submission ? "Submitted" : overdue ? "Overdue" : "Pending"}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ParentHomeworkPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Homework</h1>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
        <HomeworkList />
      </Suspense>
    </div>
  );
}
