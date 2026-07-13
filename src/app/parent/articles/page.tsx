"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChildren, ChildSwitcher } from "@/components/child-switcher";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { BookIcon } from "@/components/icons";

type Article = {
  id: string;
  title: string;
  url: string;
  reads: { openedAt: string | null; closedAt: string | null; summary: string | null }[];
};

function ArticlesList() {
  const searchParams = useSearchParams();
  const children = useChildren();
  const childId = searchParams.get("child") ?? children?.[0]?.id;
  const [items, setItems] = useState<Article[] | null>(null);

  useEffect(() => {
    if (!childId) return;
    setItems(null);
    fetch(`/api/articles?child=${childId}`)
      .then((res) => res.json())
      .then(setItems);
  }, [childId]);

  if (!children) return <Skeleton className="h-9 w-64" />;

  return (
    <div className="space-y-6">
      <ChildSwitcher students={children} basePath="/parent/articles" />
      {!items ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<BookIcon />} title="No articles posted yet" />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const read = a.reads[0];
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{a.title}</p>
                    {read?.summary && <p className="mt-1 text-sm text-slate-600">{read.summary}</p>}
                  </div>
                  <Badge tone={read?.closedAt ? "success" : read?.openedAt ? "warning" : "default"}>
                    {read?.closedAt ? "Completed" : read?.openedAt ? "In progress" : "Not opened"}
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

export default function ParentArticlesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Articles</h1>
      <Suspense fallback={<Skeleton className="h-9 w-64" />}>
        <ArticlesList />
      </Suspense>
    </div>
  );
}
