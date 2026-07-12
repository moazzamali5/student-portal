"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";

type Row = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  read: { openedAt: string | null; closedAt: string | null; summary: string | null } | null;
};

export default function AdminArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<{ title: string; url: string } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch(`/api/articles/${id}/reads`)
      .then((res) => res.json())
      .then((data) => {
        setArticle(data.article);
        setRows(data.rows);
      });
  }, [id]);

  if (!article) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/articles" className="text-sm text-indigo-600 hover:underline">
          ← Back to articles
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{article.title}</h1>
        <a href={article.url} target="_blank" className="text-sm text-indigo-600 hover:underline">
          {article.url}
        </a>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.studentId}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{r.studentName}</p>
                <p className="text-xs text-slate-500">{r.studentEmail}</p>
              </div>
              <div className="text-right text-xs text-slate-600">
                {r.read?.closedAt ? (
                  <Badge tone="success">Completed</Badge>
                ) : r.read?.openedAt ? (
                  <Badge tone="warning">Opened, not finished</Badge>
                ) : (
                  <Badge>Not opened</Badge>
                )}
                <p className="mt-1">
                  {r.read?.openedAt && <>Opened: {new Date(r.read.openedAt).toLocaleString()}<br /></>}
                  {r.read?.closedAt && <>Closed: {new Date(r.read.closedAt).toLocaleString()}</>}
                </p>
              </div>
            </div>
            {r.read?.summary && (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{r.read.summary}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
