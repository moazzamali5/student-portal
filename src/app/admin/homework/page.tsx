"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, EmptyState, ErrorText, Input, Label, Skeleton, Textarea } from "@/components/ui";
import { ClipboardIcon } from "@/components/icons";
import { StudentPicker } from "@/components/student-picker";

type Homework = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  dueDate: string;
  assignedStudentIds: string[];
  instructionsFileUrl: string | null;
  _count: { submissions: number };
};

const emptyForm = { title: "", description: "", subject: "", dueDate: "" };

export default function AdminHomeworkPage() {
  const [items, setItems] = useState<Homework[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function load() {
    const res = await fetch("/api/homework");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (studentIds.length === 0) {
      setError("Select at least one student.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("subject", form.subject);
    formData.append("dueDate", form.dueDate);
    studentIds.forEach((id) => formData.append("studentIds", id));
    if (fileInput.current?.files?.[0]) formData.append("file", fileInput.current.files[0]);

    const res = await fetch("/api/homework", { method: "POST", body: formData });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create homework.");
      return;
    }

    setForm(emptyForm);
    setStudentIds([]);
    if (fileInput.current) fileInput.current.value = "";
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/homework/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Homework</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Assign homework</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Subject (optional)</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Or upload instructions (PDF/PNG, optional)</Label>
            <input ref={fileInput} type="file" accept=".pdf,.png,application/pdf,image/png" className="text-sm" />
          </div>
          <div className="max-w-xs">
            <Label>Due date</Label>
            <Input
              type="date"
              required
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Assign to</Label>
            <StudentPicker selected={studentIds} onChange={setStudentIds} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" loading={loading}>
              Assign
            </Button>
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {items === null ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState icon={<ClipboardIcon />} title="No homework assigned yet" />
          </Card>
        ) : (
          items.map((hw) => (
            <Card key={hw.id} className="flex items-center justify-between">
              <div>
                <Link href={`/admin/homework/${hw.id}`} className="font-medium text-indigo-700 hover:underline">
                  {hw.title}
                </Link>
                <p className="text-sm text-slate-600">
                  {hw.subject ? `${hw.subject} · ` : ""}Due {new Date(hw.dueDate).toLocaleDateString()} ·{" "}
                  {hw.assignedStudentIds.length} assigned · {hw._count.submissions} submitted
                  {hw.instructionsFileUrl && (
                    <>
                      {" · "}
                      <a
                        href={`/api/homework/${hw.id}/instructions/download`}
                        target="_blank"
                        className="text-indigo-600 hover:underline"
                      >
                        View instructions
                      </a>
                    </>
                  )}
                </p>
              </div>
              <button onClick={() => handleDelete(hw.id)} className="text-sm text-red-600 hover:underline">
                Delete
              </button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
