"use client";

import { useEffect, useState } from "react";
import { Check, Library, Search } from "lucide-react";
import { Input, Modal, Select, TypeBadge, btn } from "./ui";
import { api } from "@/lib/api";
import { uid, type ParsedQuestions } from "@/lib/paper";
import { CLASSES, SUBJECTS } from "@/lib/urdu";
import type { BankQuestion } from "@/types/paper";

export default function QuestionBankModal({
  onClose,
  onInsert,
  subject,
  className,
}: {
  onClose: () => void;
  onInsert: (q: ParsedQuestions) => void;
  subject: string;
  className: string;
}) {
  const [filters, setFilters] = useState({ subject, className, type: "", search: "" });
  const [items, setItems] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setLoading(true);
      api.questions
        .list(filters)
        .then((r) => alive && setItems(r))
        .catch(() => alive && setItems([]))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [filters]);

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const insert = () => {
    const chosen = items.filter((q) => selected.has(q.id));
    onInsert({
      mcqs: chosen.filter((q) => q.type === "mcq").map((q) => ({ id: uid(), text: q.text, options: q.options.length ? [...q.options] : ["", "", "", ""] })),
      shorts: chosen.filter((q) => q.type === "short").map((q) => ({ id: uid(), text: q.text, part: "A" as const })),
      longs: chosen
        .filter((q) => q.type === "long")
        .map((q) => ({ id: uid(), text: q.text, marks: q.marks, subParts: q.subParts.map((s) => ({ id: uid(), text: s.text, marks: s.marks })) })),
    });
  };

  return (
    <Modal
      wide
      title={
        <span className="flex items-center gap-2">
          <Library className="h-5 w-5 text-emerald-700" /> Insert from Question Bank
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-sm text-slate-500">{selected.size} selected</span>
          <button className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button className={btn.primary} disabled={!selected.size} onClick={insert}>
            Insert selected
          </button>
        </>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-8" placeholder="Search…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <Select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })}>
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select value={filters.className} onChange={(e) => setFilters({ ...filters, className: e.target.value })}>
          <option value="">All classes</option>
          {CLASSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          <option value="mcq">MCQs</option>
          <option value="short">Short</option>
          <option value="long">Long</option>
        </Select>
      </div>
      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading questions…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No questions match. Add questions in the Question Bank or save a paper&apos;s questions to the bank.</p>
      ) : (
        <div className="space-y-2">
          {items.map((q) => {
            const on = selected.has(q.id);
            return (
              <button
                key={q.id}
                onClick={() => toggle(q.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${on ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <TypeBadge type={q.type} /> {q.subject} · {q.className} {q.chapter && `· ${q.chapter}`}
                  </span>
                  <span className={`block text-sm text-slate-800 ${q.language === "ur" ? "font-urdu text-right leading-loose" : ""}`} dir={q.language === "ur" ? "rtl" : "ltr"}>
                    {q.text}
                  </span>
                  {q.type === "mcq" && <span className="mt-0.5 block text-xs text-slate-500">{q.options.join(" · ")}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
