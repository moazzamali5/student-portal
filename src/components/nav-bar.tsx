"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

export function NavBar({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut(clientAuth).catch(() => {});
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-6">
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-base font-semibold text-transparent">
            {title}
          </span>
          <nav className="flex flex-wrap gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
