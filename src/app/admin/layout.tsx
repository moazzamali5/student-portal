import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { getServerUser } from "@/lib/session";

const links = [
  { href: "/admin", label: "Home" },
  { href: "/admin/timetable", label: "Timetable" },
  { href: "/admin/homework", label: "Homework" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/parents", label: "Parents" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role === "PARENT") redirect("/parent");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <NavBar title="Admin — Student Portal" links={links} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
