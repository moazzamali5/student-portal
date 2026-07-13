"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChildren, ChildSwitcher } from "@/components/child-switcher";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { ClipboardIcon } from "@/components/icons";

type Homework = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  dueDate: string;
  instructionsFileUrl: string | null;
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

  if (!children) return <Skeleton className="h-9 w-64" />;

  return (
    <div className="space-y-6">
      <ChildSwitcher students={children} basePath="/parent/homework" />
      {!items ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardIcon />} title="No homework assigned yet" />
        </Card>
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
                      {hw.title} {hw.subject && <span className="text-sm font-normal text-slate-500">({hw.subject})</span>}
                    </p>
                    {hw.description && <p className="mt-1 text-sm text-slate-600">{hw.description}</p>}
                    <p className="mt-1 text-sm text-slate-500">Due {new Date(hw.dueDate).toLocaleDateString()}</p>
                    {hw.instructionsFileUrl && (
                      <a
                        href={`/api/homework/${hw.id}/instructions/download`}
                        target="_blank"
                        className="mt-1 inline-block text-sm text-indigo-600 hover:underline"
                      >
                        View instructions (PDF)
                      </a>
                    )}
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
      <Suspense fallback={<Skeleton className="h-9 w-64" />}>
        <HomeworkList />
      </Suspense>
    </div>
  );
}
