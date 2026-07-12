"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useChildren } from "@/components/child-switcher";
import { Card } from "@/components/ui";

function ChildrenList() {
  const children = useChildren();

  if (!children) return <p className="text-sm text-slate-500">Loading...</p>;
  if (children.length === 0) return <p className="text-sm text-slate-500">No children linked to your account yet.</p>;

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
          The timetable is shared across the whole school —{" "}
          <Link href="/parent/timetable" className="text-indigo-600 hover:underline">
            view it here
          </Link>
          .
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
        <ChildrenList />
      </Suspense>
    </div>
  );
}
