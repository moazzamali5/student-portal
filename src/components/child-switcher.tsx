"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Child = { id: string; name: string; rollNumber: string | null; className: string | null };

export function useChildren() {
  const [children, setChildren] = useState<Child[] | null>(null);

  useEffect(() => {
    fetch("/api/parent/children")
      .then((res) => res.json())
      .then(setChildren);
  }, []);

  return children;
}

export function ChildSwitcher({ students, basePath }: { students: Child[]; basePath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("child") ?? students[0]?.id;

  if (students.length === 0) {
    return <p className="text-sm text-slate-500">No children linked to your account yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {students.map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`${basePath}?child=${c.id}`)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            selected === c.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
