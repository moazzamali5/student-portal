import { NavBar } from "@/components/nav-bar";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/timetable", label: "Timetable" },
  { href: "/dashboard/homework", label: "Homework" },
  { href: "/dashboard/articles", label: "Articles" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <NavBar title="Student Portal" links={links} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
