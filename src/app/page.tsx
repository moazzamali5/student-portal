import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/session";
import { Button, Card } from "@/components/ui";

export default async function Home() {
  const user = await getServerUser();

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Student Portal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Timetable, homework, and reading — all in one place.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login">
            <Button>Log in</Button>
          </Link>
          <Link href="/signup">
            <Button variant="secondary">Sign up</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
