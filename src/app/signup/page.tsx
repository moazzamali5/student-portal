"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientAuth, googleProvider } from "@/lib/firebase-client";
import { friendlyFirebaseError } from "@/lib/firebase-errors";
import { establishSessionAndRoute } from "@/lib/auth-flow";
import { StudentPicker } from "@/components/student-picker";
import { Button, Card, Divider, ErrorText, GoogleButton, Input, Label } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [className, setClassName] = useState("");
  const [role, setRole] = useState<"STUDENT" | "PARENT">("STUDENT");
  const [linkedStudentIds, setLinkedStudentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function completeRegistration(idToken: string, forceRefresh: () => Promise<string>) {
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

    // Force-refresh so the role custom claim just set by /api/register is present.
    const freshIdToken = await forceRefresh();
    await establishSessionAndRoute(freshIdToken, router);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(clientAuth, email, password);
      const idToken = await credential.user.getIdToken();
      try {
        await completeRegistration(idToken, () => credential.user.getIdToken(true));
      } catch (err) {
        await credential.user.delete().catch(() => {});
        throw err;
      }
    } catch (err) {
      setError(friendlyFirebaseError(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const credential = await signInWithPopup(clientAuth, googleProvider);
      const idToken = await credential.user.getIdToken();
      // If this Google account already has a profile, treat it as a login
      // rather than re-registering with whatever's currently in the form.
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const { role: existingRole } = await sessionRes.json();
      const alreadyHasProfile = (await fetch("/api/profile")).ok;
      if (alreadyHasProfile) {
        router.push(existingRole === "ADMIN" ? "/admin" : existingRole === "PARENT" ? "/parent" : "/dashboard");
        router.refresh();
        return;
      }
      if (!name.trim()) {
        setError("Please enter your name above before continuing with Google.");
        return;
      }
      await completeRegistration(idToken, () => credential.user.getIdToken(true));
    } catch (err) {
      setError(friendlyFirebaseError(err, "Could not sign up with Google."));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-4 py-8">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>

        <div className="mt-4">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="mt-3">
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

        {role === "PARENT" && (
          <div className="mt-3">
            <Label>Your child(ren)</Label>
            <StudentPicker selected={linkedStudentIds} onChange={setLinkedStudentIds} />
            <p className="mt-1 text-xs text-slate-500">
              A super admin needs to approve this before you can view their portal.
            </p>
          </div>
        )}

        <GoogleButton
          className="mt-4"
          disabled={googleLoading}
          onClick={handleGoogle}
          label={googleLoading ? "Signing up..." : "Continue with Google"}
        />

        <Divider label="or" className="my-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
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
          {role === "STUDENT" && (
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
          )}
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
