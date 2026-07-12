"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, ErrorText, Input, Label, Textarea } from "@/components/ui";

type Homework = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  dueDate: string;
  _count: { submissions: number };
};

const emptyForm = { title: "", description: "", subject: "", dueDate: "" };

export default function AdminHomeworkPage() {
  const [items, setItems] = useState<Homework[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);

    const res = await fetch("/api/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create homework.");
      return;
    }

    setForm(emptyForm);
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
              <Label>Subject</Label>
              <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
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
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Assign"}
            </Button>
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {items.map((hw) => (
          <Card key={hw.id} className="flex items-center justify-between">
            <div>
              <Link href={`/admin/homework/${hw.id}`} className="font-medium text-indigo-700 hover:underline">
                {hw.title}
              </Link>
              <p className="text-sm text-slate-600">
                {hw.subject} · Due {new Date(hw.dueDate).toLocaleDateString()} · {hw._count.submissions} submitted
              </p>
            </div>
            <button onClick={() => handleDelete(hw.id)} className="text-sm text-red-600 hover:underline">
              Delete
            </button>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No homework assigned yet.</p>}
      </div>
    </div>
  );
}
