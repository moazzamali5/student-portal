"use client";

import { useEffect, useState } from "react";

type Student = { id: string; name: string; rollNumber: string | null; className: string | null };

export function StudentPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [students, setStudents] = useState<Student[] | null>(null);

  useEffect(() => {
    fetch("/api/students-directory")
      .then((res) => res.json())
      .then(setStudents);
  }, []);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  if (!students) return <p className="text-sm text-slate-500">Loading students...</p>;

  if (students.length === 0) {
    return <p className="text-sm text-slate-500">No students registered yet.</p>;
  }

  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
      {students.map((s) => (
        <label
          key={s.id}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
        >
          <input
            type="checkbox"
            checked={selected.includes(s.id)}
            onChange={() => toggle(s.id)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-slate-900">
            {s.name}
            {(s.rollNumber || s.className) && (
              <span className="text-slate-500">
                {" "}
                ({[s.rollNumber, s.className].filter(Boolean).join(" / ")})
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
