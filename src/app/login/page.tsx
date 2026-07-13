"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clientAuth, googleProvider } from "@/lib/firebase-client";
import { friendlyFirebaseError } from "@/lib/firebase-errors";
import { establishSessionAndRoute } from "@/lib/auth-flow";
import { Button, Card, Divider, ErrorText, GoogleButton, Input, Label } from "@/components/ui";
import { StudyIllustration } from "@/components/illustrations";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(clientAuth, email, password);
      const idToken = await credential.user.getIdToken();
      await establishSessionAndRoute(idToken, router);
    } catch (err) {
      setError(friendlyFirebaseError(err, "Invalid email or password."));
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
      await establishSessionAndRoute(idToken, router);
    } catch (err) {
      setError(friendlyFirebaseError(err, "Could not sign in with Google."));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-4 py-8">
      <div className="flex w-full max-w-4xl items-center gap-10">
        <div className="hidden flex-1 flex-col items-center text-center lg:flex">
          <StudyIllustration className="w-full max-w-xs" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">English Class by Ali</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-600">
            Your classes, homework, and progress — all in one place.
          </p>
        </div>

        <Card className="w-full max-w-sm animate-fade-up">
          <h1 className="text-xl font-semibold text-slate-900">Log in</h1>

          <GoogleButton
            className="mt-4"
            disabled={googleLoading}
            onClick={handleGoogle}
            label={googleLoading ? "Signing in..." : "Continue with Google"}
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
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" loading={loading} className="w-full">
              Log in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            No account?{" "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
