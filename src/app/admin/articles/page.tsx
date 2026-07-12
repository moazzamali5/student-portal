"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";

type Article = {
  id: string;
  title: string;
  url: string;
  reads: { closedAt: string | null }[];
};

const emptyForm = { title: "", url: "" };

export default function AdminArticlesPage() {
  const [items, setItems] = useState<Article[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/articles");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add article.");
      return;
    }

    setForm(emptyForm);
    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Articles</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add article link</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="sm:col-span-1">
            <Label>URL</Label>
            <Input
              type="url"
              required
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-3 sm:col-span-1">
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add article"}
            </Button>
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className="flex items-center justify-between">
            <div>
              <Link href={`/admin/articles/${a.id}`} className="font-medium text-indigo-700 hover:underline">
                {a.title}
              </Link>
              <p className="text-sm text-slate-600">
                {a.url} · {a.reads.filter((r) => r.closedAt).length} completed
              </p>
            </div>
            <button onClick={() => handleDelete(a.id)} className="text-sm text-red-600 hover:underline">
              Delete
            </button>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No articles posted yet.</p>}
      </div>
    </div>
  );
}
