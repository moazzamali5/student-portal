import { NavBar } from "@/components/nav-bar";

const links = [
  { href: "/admin", label: "Home" },
  { href: "/admin/timetable", label: "Timetable" },
  { href: "/admin/homework", label: "Homework" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/students", label: "Students" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <NavBar title="Admin — Student Portal" links={links} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
