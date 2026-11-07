"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, FilePlus2, FileText, LayoutTemplate, Printer, ScanText, Scissors, FileType2, CalendarDays, ArrowRight } from "lucide-react";
import { api, type DashboardData } from "@/lib/api";
import type { PaperRecord } from "@/types/paper";
import { COPY_MODES } from "@/lib/paper";
import { Card, btn } from "@/components/ui";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recent, setRecent] = useState<PaperRecord[]>([]);

  useEffect(() => {
    api.downloads.history().then(setData).catch(() => null);
    api.papers
      .list()
      .then((r) => setRecent(r.slice(0, 6)))
      .catch(() => null);
  }, []);

  const s = data?.stats;
  const stats = [
    { label: "Total Papers", value: s?.papers, icon: FileText, color: "from-emerald-500 to-teal-600" },
    { label: "Papers This Month", value: s?.papersThisMonth, icon: CalendarDays, color: "from-sky-500 to-blue-600" },
    { label: "Question Bank", value: s?.questions, icon: BookOpen, color: "from-violet-500 to-purple-600" },
    { label: "Downloads & Prints", value: s ? (s.downloads.pdf ?? 0) + (s.downloads.docx ?? 0) + (s.downloads.print ?? 0) : undefined, icon: Download, color: "from-amber-500 to-orange-600" },
  ];
  const maxSubject = Math.max(1, ...(data?.subjects.map((x) => x.count) ?? [1]));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium text-emerald-100">Govt. High School Chak No. 446 Jhang</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Board-style exam papers in seconds</h1>
          <p className="mt-2 text-emerald-50/90">
            Mix MCQs, short and long questions in English or <span className="font-urdu">اردو</span>. Print on A4, save paper with 2-in-1 and 3-in-1 copies, or export to PDF and Word.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/create" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-emerald-800 shadow hover:bg-emerald-50">
              <FilePlus2 className="h-5 w-5" /> Create New Paper
            </Link>
            <Link href="/templates" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 font-semibold ring-1 ring-white/30 hover:bg-white/25">
              <LayoutTemplate className="h-5 w-5" /> Start from Template
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${color} text-white shadow`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">{value ?? "—"}</div>
              <div className="text-xs font-medium text-slate-500">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent Papers</h2>
            <Link href="/papers" className="flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed p-8 text-center text-sm text-slate-500">
              No papers yet.{" "}
              <Link href="/create" className="font-semibold text-emerald-700">
                Create your first paper →
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((p) => (
                <Link key={p.id} href={`/papers/${p.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-800">
                      {p.examTitle} — {p.subject}
                    </div>
                    <div className="text-xs text-slate-500">
                      Class {p.className} · {p.totalMarks} marks · {COPY_MODES.find((c) => c.value === p.copyMode)?.label} · {p.language === "ur" ? "Urdu" : "English"}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{new Date(p.updatedAt).toLocaleDateString()}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/create", label: "New Paper", icon: FilePlus2 },
                { href: "/questions", label: "Question Bank", icon: BookOpen },
                { href: "/create?step=2", label: "AI Scan", icon: ScanText },
                { href: "/templates", label: "Templates", icon: LayoutTemplate },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={label} href={href} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50">
                  <Icon className="h-5 w-5 text-emerald-700" />
                  {label}
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">Exports</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["PDF", s?.downloads.pdf ?? 0, Download],
                ["Word", s?.downloads.docx ?? 0, FileType2],
                ["Prints", s?.downloads.print ?? 0, Printer],
              ].map(([l, v, Icon]) => {
                const I = Icon as typeof Download;
                return (
                  <div key={l as string} className="rounded-xl bg-slate-50 p-3">
                    <I className="mx-auto h-4 w-4 text-slate-500" />
                    <div className="font-display text-xl font-bold">{v as number}</div>
                    <div className="text-[11px] text-slate-500">{l as string}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <Scissors className="h-4 w-4 shrink-0" /> Use 2-in-1 or 3-in-1 copies to save up to 66% paper.
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">Papers by Subject</h2>
          {!data?.subjects.length ? (
            <p className="text-sm text-slate-400">No data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.subjects.map((x) => (
                <div key={x.subject} className="flex items-center gap-3 text-sm">
                  <span className="w-32 truncate text-slate-600">{x.subject}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${(x.count / maxSubject) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right font-semibold">{x.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">Export History</h2>
          {!data?.history.length ? (
            <p className="text-sm text-slate-400">No downloads yet.</p>
          ) : (
            <div className="thin-scroll max-h-64 space-y-2 overflow-y-auto">
              {data.history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-sm">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${h.format === "pdf" ? "bg-red-100 text-red-700" : h.format === "docx" ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-700"}`}>{h.format}</span>
                  {h.paperId ? (
                    <Link href={`/papers/${h.paperId}`} className="flex-1 truncate text-slate-700 hover:underline">
                      {h.paperTitle}
                    </Link>
                  ) : (
                    <span className="flex-1 truncate text-slate-500">{h.paperTitle}</span>
                  )}
                  <span className="text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/papers" className={`${btn.ghost} mt-3 !px-0 text-emerald-700`}>
            Manage papers →
          </Link>
        </Card>
      </div>
    </div>
  );
}
