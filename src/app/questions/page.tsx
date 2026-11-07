"use client";

import { useEffect, useState } from "react";
import { BookOpen, ClipboardPaste, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { BankQuestion, Language, QuestionType } from "@/types/paper";
import { CLASSES, SUBJECTS } from "@/lib/urdu";
import { Card, Field, Input, Modal, Select, Textarea, Toast, TypeBadge, btn } from "@/components/ui";
import BulkPasteModal from "@/components/BulkPasteModal";
import type { ParsedQuestions } from "@/lib/paper";

type Draft = Omit<BankQuestion, "id" | "createdAt"> & { id?: number };

const emptyDraft = (subject: string, className: string): Draft => ({
  type: "short",
  text: "",
  options: ["", "", "", ""],
  subParts: [],
  marks: 2,
  subject: subject || "Physics",
  className: className || "10th",
  chapter: "",
  language: "en",
});

export default function QuestionBankPage() {
  const [items, setItems] = useState<BankQuestion[]>([]);
  const [f, setF] = useState({ search: "", subject: "", className: "", type: "", language: "" });
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bulk, setBulk] = useState(false);
  const [bulkMeta, setBulkMeta] = useState({ subject: "Physics", className: "10th", language: "en" as Language, chapter: "" });
  const [reload, setReload] = useState(0);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const notify = (msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api.questions
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

  const saveDraft = async () => {
    if (!draft || !draft.text.trim()) return notify("Question text is required", "err");
    const payload = { ...draft, options: draft.type === "mcq" ? draft.options : [], subParts: draft.type === "long" ? draft.subParts : [] };
    try {
      if (draft.id) await api.questions.update(draft.id, payload);
      else await api.questions.create(payload);
      notify(draft.id ? "Question updated" : "Question added");
      setDraft(null);
      setReload((r) => r + 1);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed", "err");
    }
  };

  const remove = async (q: BankQuestion) => {
    if (!confirm("Delete this question from the bank?")) return;
    await api.questions.remove(q.id);
    setReload((r) => r + 1);
  };

  const bulkInsert = async (p: ParsedQuestions) => {
    const base = { ...bulkMeta };
    const items: Partial<BankQuestion>[] = [
      ...p.mcqs.map((m) => ({ ...base, type: "mcq" as const, text: m.text, options: m.options, marks: 1 })),
      ...p.shorts.map((s) => ({ ...base, type: "short" as const, text: s.text, marks: 2 })),
      ...p.longs.map((l) => ({ ...base, type: "long" as const, text: l.text, marks: l.marks, subParts: l.subParts.map((s) => ({ text: s.text, marks: s.marks })) })),
    ];
    try {
      const r = await api.questions.bulkCreate(items);
      notify(`${r.inserted} questions added to the bank`);
      setBulk(false);
      setReload((x) => x + 1);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed", "err");
    }
  };

  const counts = { mcq: items.filter((i) => i.type === "mcq").length, short: items.filter((i) => i.type === "short").length, long: items.filter((i) => i.type === "long").length };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Question Bank</h1>
          <p className="text-sm text-slate-500">
            Central repository · {items.length} shown ({counts.mcq} MCQ · {counts.short} short · {counts.long} long)
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className={btn.secondary} onClick={() => setBulk(true)}>
            <ClipboardPaste className="h-4 w-4" /> Bulk Import
          </button>
          <button className={btn.primary} onClick={() => setDraft(emptyDraft(f.subject, f.className))}>
            <Plus className="h-4 w-4" /> Add Question
          </button>
        </div>
      </div>

      <Card className="grid gap-2 !p-3 sm:grid-cols-5">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-8" placeholder="Keyword…" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} />
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
        <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="">All types</option>
          <option value="mcq">MCQs</option>
          <option value="short">Short</option>
          <option value="long">Long</option>
        </Select>
        <Select value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>
          <option value="">All languages</option>
          <option value="en">English</option>
          <option value="ur">Urdu</option>
        </Select>
      </Card>

      {loading ? (
        <p className="py-16 text-center text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="py-14 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">The question bank is empty for these filters.</p>
          <p className="text-sm text-slate-400">Add questions manually, bulk import, or save questions from any paper.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((q) => (
            <Card key={q.id} className="flex items-start gap-3 !p-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <TypeBadge type={q.type} />
                  <span>{q.subject}</span>·<span>Class {q.className}</span>
                  {q.chapter && <span>· {q.chapter}</span>}
                  <span>· {q.marks} mark{q.marks === 1 ? "" : "s"}</span>
                </div>
                <div className={`text-slate-800 ${q.language === "ur" ? "font-urdu text-right leading-loose" : ""}`} dir={q.language === "ur" ? "rtl" : "ltr"}>
                  {q.text}
                  {q.type === "mcq" && (
                    <div className="mt-1 grid grid-cols-2 gap-x-4 text-sm text-slate-500 sm:grid-cols-4">
                      {q.options.map((o, i) => (
                        <span key={i}>
                          ({"ABCD"[i]}) {o}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === "long" &&
                    q.subParts.map((s, i) => (
                      <div key={i} className="ps-4 text-sm text-slate-500">
                        ({"abcdef"[i]}) {s.text} ({s.marks})
                      </div>
                    ))}
                </div>
              </div>
              <button className={btn.icon} onClick={() => setDraft({ ...q, options: q.options.length ? q.options : ["", "", "", ""] })} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </button>
              <button className={`${btn.icon} hover:!text-red-600`} onClick={() => remove(q)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "Edit Question" : "Add Question"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <button className={btn.secondary} onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button className={btn.primary} onClick={saveDraft}>
                Save
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type">
              <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as QuestionType, marks: e.target.value === "mcq" ? 1 : e.target.value === "short" ? 2 : 5 })}>
                <option value="mcq">MCQ</option>
                <option value="short">Short</option>
                <option value="long">Long</option>
              </Select>
            </Field>
            <Field label="Language">
              <Select value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}>
                <option value="en">English</option>
                <option value="ur">Urdu</option>
              </Select>
            </Field>
            <Field label="Marks">
              <Input type="number" min={1} value={draft.marks} onChange={(e) => setDraft({ ...draft, marks: Number(e.target.value) || 1 })} />
            </Field>
            <Field label="Subject">
              <Input list="bank-subjects" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              <datalist id="bank-subjects">
                {SUBJECTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Class">
              <Select value={draft.className} onChange={(e) => setDraft({ ...draft, className: e.target.value })}>
                {CLASSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Chapter">
              <Input value={draft.chapter} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })} placeholder="e.g. Ch. 3" />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Question">
              <Textarea rows={3} dir={draft.language === "ur" ? "rtl" : "ltr"} className={draft.language === "ur" ? "font-urdu leading-loose" : ""} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
            </Field>
          </div>
          {draft.type === "mcq" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {draft.options.map((o, i) => (
                <Input key={i} dir={draft.language === "ur" ? "rtl" : "ltr"} placeholder={`Option ${"ABCD"[i]}`} value={o} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? e.target.value : x)) })} />
              ))}
            </div>
          )}
          {draft.type === "long" && (
            <div className="mt-3 space-y-2">
              {draft.subParts.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`Sub-part (${"abcdef"[i]})`} value={s.text} onChange={(e) => setDraft({ ...draft, subParts: draft.subParts.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                  <Input type="number" className="!w-20" value={s.marks} onChange={(e) => setDraft({ ...draft, subParts: draft.subParts.map((x, j) => (j === i ? { ...x, marks: Number(e.target.value) || 0 } : x)) })} />
                  <button className={btn.icon} onClick={() => setDraft({ ...draft, subParts: draft.subParts.filter((_, j) => j !== i) })} aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button className="text-sm font-semibold text-emerald-700" onClick={() => setDraft({ ...draft, subParts: [...draft.subParts, { text: "", marks: 0 }] })}>
                + Add sub-part
              </button>
            </div>
          )}
        </Modal>
      )}

      {bulk && (
        <>
          <div className="no-print fixed left-1/2 top-4 z-[55] flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl bg-white p-2 shadow-lg ring-1 ring-black/5">
            <span className="px-1 text-xs font-semibold text-slate-500">Import as:</span>
            <Select className="!w-36 !py-1" value={bulkMeta.subject} onChange={(e) => setBulkMeta({ ...bulkMeta, subject: e.target.value })}>
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select className="!w-24 !py-1" value={bulkMeta.className} onChange={(e) => setBulkMeta({ ...bulkMeta, className: e.target.value })}>
              {CLASSES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select className="!w-24 !py-1" value={bulkMeta.language} onChange={(e) => setBulkMeta({ ...bulkMeta, language: e.target.value as Language })}>
              <option value="en">English</option>
              <option value="ur">Urdu</option>
            </Select>
            <Input className="!w-28 !py-1" placeholder="Chapter" value={bulkMeta.chapter} onChange={(e) => setBulkMeta({ ...bulkMeta, chapter: e.target.value })} />
          </div>
          <BulkPasteModal onClose={() => setBulk(false)} onInsert={bulkInsert} language={bulkMeta.language} defaultLongMarks={5} />
        </>
      )}
      {toast && <Toast msg={toast.msg} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}
