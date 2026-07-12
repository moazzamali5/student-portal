"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientAuth } from "@/lib/firebase-client";
import { friendlyFirebaseError } from "@/lib/firebase-errors";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [className, setClassName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(clientAuth, email, password);
      const idToken = await credential.user.getIdToken();

      const registerRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name, rollNumber, className }),
      });
      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => ({}));
        // Roll back the just-created auth account so retrying signup doesn't
        // permanently strand this email as "already in use" with no profile.
        await credential.user.delete().catch(() => {});
        throw new Error(data.error ?? "Something went wrong.");
      }

      // Force-refresh so the role custom claim just set by /api/register is present.
      const freshIdToken = await credential.user.getIdToken(true);
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: freshIdToken }),
      });
      if (!sessionRes.ok) throw new Error("Account created — please log in.");
      const { role } = await sessionRes.json();

      router.push(role === "ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(friendlyFirebaseError(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
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
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </main>
  );
}
