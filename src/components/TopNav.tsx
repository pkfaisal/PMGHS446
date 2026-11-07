"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, FilePlus2, FileText, LayoutDashboard, LayoutTemplate, Menu, Settings, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create Paper", icon: FilePlus2 },
  { href: "/papers", label: "My Papers", icon: FileText },
  { href: "/questions", label: "Question Bank", icon: BookOpen },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function TopNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-emerald-900/20 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/30">
            <FileText className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight">Smart School Paper Maker</div>
            <div className="text-[11px] text-emerald-100">Govt. High School Chak No. 446 Jhang</div>
          </div>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active(href) ? "bg-white text-emerald-800 shadow" : "text-emerald-50 hover:bg-white/15"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <button className="ml-auto rounded-lg p-2 hover:bg-white/15 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav className="grid gap-1 border-t border-white/10 px-4 pb-3 lg:hidden">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active(href) ? "bg-white text-emerald-800" : "hover:bg-white/15"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
