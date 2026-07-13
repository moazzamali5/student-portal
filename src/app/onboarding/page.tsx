"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientAuth } from "@/lib/firebase-client";
import { establishSessionAndRoute } from "@/lib/auth-flow";
import { StudentPicker } from "@/components/student-picker";
import { Button, Card, ErrorText, Input, Label, Skeleton } from "@/components/ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "PARENT">("STUDENT");
  const [rollNumber, setRollNumber] = useState("");
  const [className, setClassName] = useState("");
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Not signed in at all (e.g. direct navigation) — send back to login.
    const unsubscribe = clientAuth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setName(user.displayName ?? "");
      setReady(true);
    });
    return unsubscribe;
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = clientAuth.currentUser;
      if (!user) throw new Error("Session expired — please sign in again.");
      const idToken = await user.getIdToken();

      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          name,
          rollNumber,
          className,
          requestedRole: role,
          linkedStudentIds: role === "PARENT" ? linkedStudentIds : undefined,
        }),
      });
      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }

      const freshIdToken = await user.getIdToken(true);
      await establishSessionAndRoute(freshIdToken, router);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Skeleton className="h-64 w-full max-w-sm" />
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-4 py-8">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900">One more step</h1>
        <p className="mt-1 text-sm text-slate-600">Tell us a bit about yourself to finish setting up your account.</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>I am a</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={role === "STUDENT"} onChange={() => setRole("STUDENT")} />
                Student
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={role === "PARENT"} onChange={() => setRole("PARENT")} />
                Parent
              </label>
            </div>
          </div>

          {role === "STUDENT" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rollNumber">Roll number</Label>
                <Input id="rollNumber" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="className">Class</Label>
                <Input id="className" value={className} onChange={(e) => setClassName(e.target.value)} />
              </div>
            </div>
          ) : (
            <div>
              <Label>Your child(ren)</Label>
              <StudentPicker selected={linkedStudentIds} onChange={setLinkedStudentIds} />
              <p className="mt-1 text-xs text-slate-500">
                A super admin needs to approve this before you can view their portal.
              </p>
            </div>
          )}

          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={loading} className="w-full">
            Continue
          </Button>
        </form>
      </Card>
    </main>
  );
}
