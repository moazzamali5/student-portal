"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { BookIcon } from "@/components/icons";

type Article = {
  id: string;
  title: string;
  url: string;
  reads: { openedAt: string | null; closedAt: string | null }[];
};

export default function StudentArticlesPage() {
  const [items, setItems] = useState<Article[] | null>(null);

  useEffect(() => {
    fetch("/api/articles")
      .then((res) => res.json())
      .then(setItems);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Articles</h1>
      <div className="space-y-3">
        {items === null ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : items.length === 0 ? (
          <Card>
            <EmptyState icon={<BookIcon />} title="No articles posted yet" />
          </Card>
        ) : (
          items.map((a) => {
            const read = a.reads[0];
            return (
              <Card key={a.id} className="flex items-center justify-between">
                <Link href={`/dashboard/articles/${a.id}`} className="font-medium text-indigo-700 hover:underline">
                  {a.title}
                </Link>
                <Badge tone={read?.closedAt ? "success" : read?.openedAt ? "warning" : "default"}>
                  {read?.closedAt ? "Completed" : read?.openedAt ? "In progress" : "Not opened"}
                </Badge>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
