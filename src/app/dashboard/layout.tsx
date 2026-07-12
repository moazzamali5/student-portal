import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getServerUser } from "@/lib/session";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/timetable", label: "Timetable" },
  { href: "/dashboard/homework", label: "Homework" },
  { href: "/dashboard/articles", label: "Articles" },
  { href: "/dashboard/planner", label: "Planner" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "PARENT") redirect("/parent");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <NavBar title="Student Portal" links={links} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
