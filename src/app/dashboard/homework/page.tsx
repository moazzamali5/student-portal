"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorText, Skeleton } from "@/components/ui";
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

export default function StudentHomeworkPage() {
  const [items, setItems] = useState<Homework[] | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    const res = await fetch("/api/homework");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(homeworkId: string, file: File) {
    setUploadingId(homeworkId);
    setErrors((e) => ({ ...e, [homeworkId]: "" }));

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/homework/${homeworkId}/submit`, {
      method: "POST",
      body: formData,
    });

    setUploadingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrors((e) => ({ ...e, [homeworkId]: data.error ?? "Upload failed." }));
      return;
    }

    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Homework</h1>
      <div className="space-y-3">
        {items === null ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState icon={<ClipboardIcon />} title="No homework assigned yet" />
          </Card>
        ) : (
          items.map((hw) => {
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
                  <p className="mt-1 text-sm text-slate-500">
                    Due {new Date(hw.dueDate).toLocaleDateString()}
                  </p>
                  {hw.instructionsFileUrl && (
                    <a
                      href={`/api/homework/${hw.id}/instructions/download`}
                      target="_blank"
                      className="mt-1 inline-block text-sm text-indigo-600 hover:underline"
                    >
                      View instructions (PDF)
                    </a>
                  )}
                </div>
                <Badge tone={submission ? "success" : overdue ? "danger" : "warning"}>
                  {submission ? "Submitted" : overdue ? "Overdue" : "Pending"}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-3">
                {submission && (
                  <a
                    href={`/api/homework/submissions/${submission.id}/download`}
                    target="_blank"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    View my submission ({submission.fileType.toUpperCase()})
                  </a>
                )}
                <input
                  ref={(el) => {
                    fileInputs.current[hw.id] = el;
                  }}
                  type="file"
                  accept=".pdf,.png,application/pdf,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(hw.id, file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="secondary"
                  loading={uploadingId === hw.id}
                  onClick={() => fileInputs.current[hw.id]?.click()}
                >
                  {submission ? "Resubmit (PDF/PNG)" : "Upload (PDF/PNG)"}
                </Button>
                <ErrorText>{errors[hw.id]}</ErrorText>
              </div>
            </Card>
          );
          })
        )}
      </div>
    </div>
  );
}
