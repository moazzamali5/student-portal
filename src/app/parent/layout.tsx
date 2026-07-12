import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getServerUser } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { COLLECTIONS } from "@/lib/collections";
import { Card } from "@/components/ui";

const links = [
  { href: "/parent", label: "Home" },
  { href: "/parent/timetable", label: "Timetable" },
  { href: "/parent/homework", label: "Homework" },
  { href: "/parent/articles", label: "Articles" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "STUDENT") redirect("/dashboard");

  const doc = await adminDb().collection(COLLECTIONS.users).doc(user.id).get();
  const approvalStatus = (doc.data()?.approvalStatus as string | undefined) ?? "PENDING";

  if (approvalStatus !== "APPROVED") {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <NavBar title="Parent Portal" links={[]} />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
          <Card className="text-center">
            <h1 className="text-lg font-semibold text-slate-900">
              {approvalStatus === "REJECTED" ? "Request declined" : "Pending approval"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {approvalStatus === "REJECTED"
                ? "Your request to view a student's portal was declined by the admin. Contact the school if you believe this is a mistake."
                : "A super admin needs to approve your request before you can view your child's portal — check back soon."}
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <NavBar title="Parent Portal" links={links} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
