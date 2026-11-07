"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookPlus, Copy, Eye, FilePlus2, FileText, FileType2, Pencil, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { PaperRecord } from "@/types/paper";
import { COPY_MODES } from "@/lib/paper";
import { CLASSES, SUBJECTS } from "@/lib/urdu";
import { Card, Input, Select, Toast, btn } from "@/components/ui";

export default function MyPapers() {
  const [items, setItems] = useState<PaperRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [f, setF] = useState({ search: "", subject: "", className: "" });
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [reload, setReload] = useState(0);

  const notify = (msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.papers
        .list(f)
        .then((r) => alive && setItems(r))
        .catch(() => alive && setItems([]))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [f, reload]);

  const duplicate = async (id: number) => {
    await api.papers.duplicate(id);
    notify("Paper duplicated");
    setReload((r) => r + 1);
  };
  const remove = async (p: PaperRecord) => {
    if (!confirm(`Delete "${p.examTitle} — ${p.subject}"? This cannot be undone.`)) return;
    await api.papers.remove(p.id);
    notify("Paper deleted");
    setReload((r) => r + 1);
  };
  const toBank = async (id: number) => {
    const r = await api.questions.importFromPaper(id);
    notify(`${r.inserted} questions saved to bank`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">My Papers</h1>
          <p className="text-sm text-slate-500">Archive of all examination papers — search, duplicate, edit and export.</p>
        </div>
        <Link href="/create" className={`${btn.primary} ml-auto`}>
          <FilePlus2 className="h-4 w-4" /> New Paper
        </Link>
      </div>

      <Card className="grid gap-2 !p-3 sm:grid-cols-[1fr_200px_160px]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-8" placeholder="Search by title, subject or class…" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} />
        </div>
        <Select value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}>
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select value={f.className} onChange={(e) => setF({ ...f, className: e.target.value })}>
          <option value="">All classes</option>
          {CLASSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Card>

      {loading ? (
        <p className="py-16 text-center text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="py-14 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No papers found.</p>
          <Link href="/create" className={`${btn.primary} mt-4`}>
            Create a paper
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const qCount =
              (p.data.mcqs?.length || 0) +
              (p.data.blanks?.length || 0) +
              (p.data.translations?.length || 0) +
              (p.data.passages?.length || 0) +
              (p.data.maths?.length || 0) +
              (p.data.shorts?.length || 0) +
              (p.data.shortPartitions?.reduce((a, sp) => a + (sp.questions?.length || 0), 0) || 0) +
              (p.data.longs?.length || 0);
            return (
              <Card key={p.id} className="flex flex-col !p-4">
                <div className="mb-2 flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${p.language === "ur" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/papers/${p.id}`} className="block truncate font-semibold text-slate-800 hover:underline">
                      {p.examTitle}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {p.subject} · Class {p.className}
                    </div>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{p.totalMarks}m</span>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
                  {(p.data.mcqs?.length || 0) > 0 && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">{p.data.mcqs?.length} MCQ</span>}
                  {(p.data.blanks?.length || 0) > 0 && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{p.data.blanks?.length} Blanks</span>}
                  {(p.data.translations?.length || 0) > 0 && <span className="rounded bg-teal-50 px-1.5 py-0.5 text-teal-700">{p.data.translations?.length} Translation</span>}
                  {(p.data.passages?.length || 0) > 0 && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">{p.data.passages?.length} Passage</span>}
                  {(p.data.maths?.length || 0) > 0 && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">{p.data.maths?.length} Math</span>}
                  {(p.data.shorts?.length || 0) > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{p.data.shorts?.length} Short</span>}
                  {(p.data.shortPartitions?.length || 0) > 0 && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{p.data.shortPartitions?.length} Partitions</span>}
                  {(p.data.longs?.length || 0) > 0 && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{p.data.longs?.length} Long</span>}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{COPY_MODES.find((c) => c.value === p.copyMode)?.label}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{p.language === "ur" ? "اردو" : "English"}</span>
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-slate-400">
                  <span>
                    {qCount} questions · {p.downloads} exports · {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Link href={`/papers/${p.id}`} className={btn.icon} title="Preview & export">
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link href={`/create?id=${p.id}`} className={btn.icon} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button className={btn.icon} title="Duplicate" onClick={() => duplicate(p.id)}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <a className={btn.icon} title="Download Word" href={api.downloads.docxUrl(p.id)}>
                    <FileType2 className="h-4 w-4" />
                  </a>
                  <button className={btn.icon} title="Save questions to bank" onClick={() => toBank(p.id)}>
                    <BookPlus className="h-4 w-4" />
                  </button>
                  <button className={`${btn.icon} ml-auto hover:!text-red-600`} title="Delete" onClick={() => remove(p)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {toast && <Toast msg={toast.msg} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}
