import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

// Shared by email/password and Google sign-in: mint the session cookie from
// a Firebase ID token, then route based on whether onboarding (name + role)
// has been completed yet — a first-time Google sign-in has no profile doc.
export async function establishSessionAndRoute(idToken: string, router: Router) {
  const sessionRes = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!sessionRes.ok) throw new Error("Could not sign you in. Please try again.");
  const { role } = await sessionRes.json();

  const profileRes = await fetch("/api/profile");
  if (profileRes.status === 404) {
    router.push("/onboarding");
    router.refresh();
    return;
  }

  router.push(role === "ADMIN" ? "/admin" : role === "PARENT" ? "/parent" : "/dashboard");
  router.refresh();
}
