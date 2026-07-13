"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useChildren } from "@/components/child-switcher";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { UsersIcon } from "@/components/icons";

function ChildrenList() {
  const children = useChildren();

  if (!children) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (children.length === 0) {
    return (
      <Card>
        <EmptyState icon={<UsersIcon />} title="No children linked to your account yet" />
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {children.map((c) => (
        <Card key={c.id}>
          <p className="font-medium text-slate-900">{c.name}</p>
          <p className="text-sm text-slate-500">
            {[c.rollNumber, c.className].filter(Boolean).join(" · ") || "—"}
          </p>
          <div className="mt-3 flex gap-3 text-sm">
            <Link href={`/parent/homework?child=${c.id}`} className="text-indigo-600 hover:underline">
              Homework
            </Link>
            <Link href={`/parent/articles?child=${c.id}`} className="text-indigo-600 hover:underline">
              Articles
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ParentHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Your children</h1>
        <p className="mt-1 text-sm text-slate-600">
          Each child has their own class schedule —{" "}
          <Link href="/parent/timetable" className="text-indigo-600 hover:underline">
            view it here
          </Link>
          .
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        }
      >
        <ChildrenList />
      </Suspense>
    </div>
  );
}
