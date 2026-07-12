"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, ErrorText, Textarea } from "@/components/ui";

type ArticleRead = { openedAt: string | null; closedAt: string | null; summary: string | null };
type Article = { id: string; title: string; url: string; reads: ArticleRead[] };

export default function StudentArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/articles")
      .then((res) => res.json())
      .then((all: Article[]) => {
        const found = all.find((a) => a.id === id) ?? null;
        setArticle(found);
        setSummary(found?.reads[0]?.summary ?? "");
      });

    fetch(`/api/articles/${id}/open`, { method: "POST" });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch(`/api/articles/${id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save.");
      return;
    }

    setSaved(true);
  }

  if (!article) return <p className="text-sm text-slate-500">Loading...</p>;

  const read = article.reads[0];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/articles" className="text-sm text-indigo-600 hover:underline">
        ← Back to articles
      </Link>

      <Card>
        <h1 className="text-xl font-semibold text-slate-900">{article.title}</h1>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
        >
          Open article in a new tab →
        </a>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          What was this article about?
        </h2>
        <p className="mb-3 text-sm text-slate-600">
          Once you&apos;ve read it, write a short summary in your own words and submit.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            rows={6}
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summarize what you read..."
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : read?.closedAt ? "Update summary" : "Submit summary"}
            </Button>
            {saved && <span className="text-sm text-emerald-600">Saved.</span>}
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      </Card>
    </div>
  );
}
