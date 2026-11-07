"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookPlus,
  Check,
  ClipboardPaste,
  Copy,
  Library,
  Loader2,
  Plus,
  Save,
  ScanText,
  Sparkles,
  Trash2,
  LayoutTemplate,
  HelpCircle,
  FileText,
  Languages,
  BookOpen,
  Calculator,
  ListTree,
  FileCheck2,
} from "lucide-react";
import type {
  BlankQuestion,
  CopyMode,
  Language,
  LongQuestion,
  MathQuestion,
  MCQ,
  PaperData,
  PassageQuestion,
  SchoolSettings,
  ShortPartition,
  ShortQuestion,
  TranslationItem,
} from "@/types/paper";
import { api } from "@/lib/api";
import {
  COPY_MODES,
  DEFAULT_SETTINGS,
  applyTemplate,
  createDefaultPaper,
  longMarks,
  sectionMarks,
  totalMarks,
  uid,
  type ParsedQuestions,
} from "@/lib/paper";
import { CLASSES, MONTHS, SUBJECTS } from "@/lib/urdu";
import { Card, Field, Input, Select, Textarea, Toast, Toggle, btn } from "./ui";
import BulkPasteModal from "./BulkPasteModal";
import QuestionBankModal from "./QuestionBankModal";
import OcrModal from "./OcrModal";
import { ExportActions, ZoomablePaper } from "./PaperPreviewPane";
import { correctQuestionText } from "@/lib/questionCorrection";
import { MATH_SYMBOLS } from "@/lib/mathHelper";

const STEPS = ["Exam Particulars & Sections", "Question Authoring", "Preview & Export"];

function CopyModeIcon({ mode }: { mode: CopyMode }) {
  const slots = mode === "2in1" ? 2 : mode === "3in1" ? 3 : 1;
  const pages = mode === "2pages" ? 2 : 1;
  return (
    <div className="flex gap-1">
      {Array.from({ length: pages }).map((_, p) => (
        <div key={p} className="flex h-12 w-9 flex-col rounded-sm border border-slate-400 bg-white p-0.5">
          {Array.from({ length: slots }).map((_, s) => (
            <div key={s} className={`flex-1 ${s > 0 ? "border-t border-dashed border-slate-400" : ""}`}>
              <div className="mx-0.5 mt-0.5 h-0.5 rounded bg-slate-400" />
              <div className="mx-0.5 mt-0.5 h-0.5 w-2/3 rounded bg-slate-300" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
}

export default function CreatePaperWizard({
  paperId,
  templateId,
  initialStep,
}: {
  paperId: number | null;
  templateId: number | null;
  initialStep: number;
}) {
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [paper, setPaper] = useState<PaperData | null>(null);
  const [id, setId] = useState<number | null>(paperId);
  const [step, setStep] = useState(Math.min(3, Math.max(1, initialStep || 1)));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [modal, setModal] = useState<"" | "bulk" | "bank" | "ocr">("");
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const [loadError, setLoadError] = useState("");

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.settings.get().catch(() => DEFAULT_SETTINGS);
        setSettings(s);
        if (paperId) {
          const rec = await api.papers.get(paperId);
          const raw = rec.data;
          // Ensure all new section arrays are defined for backward compatibility
          const cleanPaper: PaperData = {
            ...raw,
            sections: {
              ...createDefaultPaper(s).sections,
              ...raw.sections,
            },
            mcqs: raw.mcqs || [],
            blanks: raw.blanks || [],
            translations: raw.translations || [],
            passages: raw.passages || [],
            maths: raw.maths || [],
            shorts: raw.shorts || [],
            shortPartitions: raw.shortPartitions || [],
            longs: raw.longs || [],
          };
          setPaper(cleanPaper);
        } else {
          let p = createDefaultPaper(s);
          if (templateId) {
            const t = await api.templates.get(templateId).catch(() => null);
            if (t) {
              p = applyTemplate(p, t.config);
              if (t.config.language === "ur") p.schoolName = s.schoolNameUrdu;
            }
          }
          setPaper(p);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [paperId, templateId]);

  const update = (patch: Partial<PaperData>) => {
    setPaper((p) => (p ? { ...p, ...patch } : p));
    setDirty(true);
  };

  const updateSection = <K extends keyof PaperData["sections"]>(
    k: K,
    patch: Record<string, unknown>
  ) => {
    setPaper((p) => {
      if (!p) return p;
      const current = (p.sections[k] || {}) as Record<string, unknown>;
      return {
        ...p,
        sections: {
          ...p.sections,
          [k]: { ...current, ...patch },
        },
      };
    });
    setDirty(true);
  };

  const save = useCallback(
    async (silent = false): Promise<number | null> => {
      if (!paper) return null;
      setSaving(true);
      try {
        const rec = id ? await api.papers.update(id, paper) : await api.papers.create(paper);
        if (!id) window.history.replaceState(null, "", `/create?id=${rec.id}`);
        setId(rec.id);
        setDirty(false);
        if (!silent) notify("Paper saved");
        return rec.id;
      } catch (e) {
        notify(e instanceof Error ? e.message : "Save failed", "err");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [paper, id, notify],
  );

  const insertQuestions = (q: ParsedQuestions) => {
    if (!paper) return;
    const lang = paper.language;
    const cleanMcqs = q.mcqs.map((m) => ({
      ...m,
      text: correctQuestionText(m.text, lang),
      options: m.options.map((o) => correctQuestionText(o, lang)),
    }));
    const cleanShorts = q.shorts.map((s) => ({ ...s, text: correctQuestionText(s.text, lang) }));
    const cleanLongs = q.longs.map((l) => ({
      ...l,
      text: correctQuestionText(l.text, lang),
      subParts: l.subParts.map((sp) => ({ ...sp, text: correctQuestionText(sp.text, lang) })),
    }));
    update({
      mcqs: [...(paper.mcqs || []), ...cleanMcqs],
      shorts: [...(paper.shorts || []), ...cleanShorts],
      longs: [...(paper.longs || []), ...cleanLongs],
      sections: {
        ...paper.sections,
        mcq: { ...paper.sections.mcq, enabled: paper.sections.mcq.enabled || cleanMcqs.length > 0 },
        short: { ...paper.sections.short, enabled: paper.sections.short.enabled || cleanShorts.length > 0 },
        long: { ...paper.sections.long, enabled: paper.sections.long.enabled || cleanLongs.length > 0 },
      },
    });
    setModal("");
    notify(`Inserted ${cleanMcqs.length + cleanShorts.length + cleanLongs.length} questions (auto-formatted)`);
  };

  const autoCorrectAll = () => {
    if (!paper) return;
    const lang = paper.language;
    update({
      mcqs: (paper.mcqs || []).map((m) => ({
        ...m,
        text: correctQuestionText(m.text, lang),
        options: m.options.map((o) => correctQuestionText(o, lang)),
      })),
      blanks: (paper.blanks || []).map((b) => ({ ...b, text: correctQuestionText(b.text, lang) })),
      translations: (paper.translations || []).map((t) => ({ ...t, text: correctQuestionText(t.text, lang) })),
      passages: (paper.passages || []).map((pass) => ({
        ...pass,
        passageText: correctQuestionText(pass.passageText, lang),
        subQuestions: (pass.subQuestions || []).map((sq) => ({ ...sq, text: correctQuestionText(sq.text, lang) })),
      })),
      maths: (paper.maths || []).map((m) => ({
        ...m,
        text: correctQuestionText(m.text, lang),
        subParts: (m.subParts || []).map((sp) => ({ ...sp, text: correctQuestionText(sp.text, lang) })),
      })),
      shorts: (paper.shorts || []).map((s) => ({ ...s, text: correctQuestionText(s.text, lang) })),
      shortPartitions: (paper.shortPartitions || []).map((part) => ({
        ...part,
        questions: (part.questions || []).map((q) => ({ ...q, text: correctQuestionText(q.text, lang) })),
      })),
      longs: (paper.longs || []).map((l) => ({
        ...l,
        text: correctQuestionText(l.text, lang),
        subParts: (l.subParts || []).map((sp) => ({ ...sp, text: correctQuestionText(sp.text, lang) })),
      })),
    });
    notify("All questions checked & typing/spelling mistakes corrected!");
  };

  const saveToBank = async () => {
    const pid = await save(true);
    if (!pid) return;
    try {
      const r = await api.questions.importFromPaper(pid);
      notify(`Saved ${r.inserted} questions to the bank${r.skipped ? ` (${r.skipped} already existed)` : ""}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed", "err");
    }
  };

  const saveAsTemplate = async () => {
    if (!paper) return;
    const name = window.prompt(
      "Template name",
      `${paper.examTitle} — ${COPY_MODES.find((c) => c.value === paper.copyMode)?.label}`
    );
    if (!name) return;
    try {
      await api.templates.create(name, `Custom template · ${paper.language === "ur" ? "Urdu" : "English"}`, {
        examTitle: paper.examTitle,
        copyMode: paper.copyMode,
        language: paper.language,
        timeAllowed: paper.timeAllowed,
        showStudentName: paper.showStudentName,
        showRollNo: paper.showRollNo,
        showSection: paper.showSection,
        sections: paper.sections,
      });
      notify("Template saved");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed", "err");
    }
  };

  if (loadError) return <Card className="text-center text-red-600">{loadError}</Card>;
  if (!paper)
    return (
      <div className="flex justify-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const ur = paper.language === "ur";
  const marks = sectionMarks(paper);

  const setLanguage = (l: Language) => {
    if (l === paper.language) return;
    const toUr = l === "ur";
    const swap = (cur: string, en: string, urd: string) => (cur === (toUr ? en : urd) ? (toUr ? urd : en) : cur);
    const titleSwap = (cur: string) => {
      if (toUr) {
        if (cur === "Weekly Test") return "ہفتہ وار ٹیسٹ";
        if (cur === "Monthly Test") return "ماہانہ ٹیسٹ";
        if (cur === "Mid Term") return "وسط مدتی امتحان";
        if (cur === "Final Exam") return "سالانہ امتحان";
        return cur;
      } else {
        if (cur === "ہفتہ وار ٹیسٹ") return "Weekly Test";
        if (cur === "ماہانہ ٹیسٹ") return "Monthly Test";
        if (cur === "وسط مدتی امتحان") return "Mid Term";
        if (cur === "سالانہ امتحان") return "Final Exam";
        return cur;
      }
    };
    update({
      language: l,
      examTitle: titleSwap(paper.examTitle),
      schoolName: swap(paper.schoolName, settings.schoolName, settings.schoolNameUrdu),
      sections: {
        ...paper.sections,
        mcq: { ...paper.sections.mcq, instructions: swap(paper.sections.mcq.instructions, settings.mcqInstructions, settings.mcqInstructionsUrdu) },
        blanks: paper.sections.blanks
          ? {
              ...paper.sections.blanks,
              instructions: swap(paper.sections.blanks.instructions, settings.blanksInstructions || "Fill in the blanks.", settings.blanksInstructionsUrdu || "خالی جگہیں پُر کریں۔"),
            }
          : undefined,
        translation: paper.sections.translation
          ? {
              ...paper.sections.translation,
              instructions: swap(paper.sections.translation.instructions, settings.translationInstructions || "Translate the following sentences into Urdu.", settings.translationInstructionsUrdu || "مندرجہ ذیل کا انگریزی میں ترجمہ کریں۔"),
            }
          : undefined,
        passage: paper.sections.passage
          ? {
              ...paper.sections.passage,
              instructions: swap(paper.sections.passage.instructions, settings.passageInstructions || "Read the following paragraph carefully and answer the questions below.", settings.passageInstructionsUrdu || "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔"),
            }
          : undefined,
        math: paper.sections.math
          ? {
              ...paper.sections.math,
              instructions: swap(paper.sections.math.instructions, settings.mathInstructions || "Solve the following mathematical questions / equations.", settings.mathInstructionsUrdu || "درج ذیل حسابی سوالات اور مساوات حل کریں۔"),
            }
          : undefined,
        short: { ...paper.sections.short, instructions: swap(paper.sections.short.instructions, settings.shortInstructions, settings.shortInstructionsUrdu) },
        long: { ...paper.sections.long, instructions: swap(paper.sections.long.instructions, settings.longInstructions, settings.longInstructionsUrdu) },
      },
    });
  };

  const txtProps = { dir: ur ? "rtl" : "ltr", className: ur ? "font-urdu leading-loose" : "" } as const;

  return (
    <div className="space-y-5">
      {/* Header + stepper */}
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">{id ? "Edit Paper" : "Create New Paper"}</h1>
          <p className="text-sm text-slate-500">
            {paper.examTitle} · {paper.className} · {paper.subject} · <b>{totalMarks(paper)} marks</b>
            {dirty && <span className="ml-2 text-amber-600">• unsaved changes</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className={btn.secondary} onClick={() => save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>

      <div className="no-print grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const state = n === step ? "cur" : n < step ? "done" : "todo";
          return (
            <button
              key={s}
              onClick={() => setStep(n)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                state === "cur" ? "border-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  state === "done" ? "bg-emerald-600 text-white" : state === "cur" ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {state === "done" ? <Check className="h-4 w-4" /> : n}
              </span>
              <span className="hidden sm:block">
                <span className="block text-[11px] font-semibold uppercase text-slate-400">Step {n}</span>
                <span className="block text-sm font-semibold text-slate-700">{s}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: Exam Particulars & Sections Setup */}
      {step === 1 && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="mb-4 font-display text-lg font-bold">Exam Particulars</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="School / Institution name">
                  <Input {...txtProps} value={paper.schoolName} onChange={(e) => update({ schoolName: e.target.value })} className={txtProps.className} />
                </Field>
              </div>
              <Field label="Exam title">
                <Input list="exam-titles" value={paper.examTitle} onChange={(e) => update({ examTitle: e.target.value })} />
                <datalist id="exam-titles">
                  {(ur
                    ? ["ہفتہ وار ٹیسٹ", "ماہانہ ٹیسٹ", "وسط مدتی امتحان", "سالانہ امتحان", "اچانک ٹیسٹ", "روزانہ ٹیسٹ"]
                    : ["Weekly Test", "Monthly Test", "Mid Term", "Final Exam", "Surprise Quiz", "Daily Test"]
                  ).map((t) => (
                    <option key={t} value={t} />
                  ))}
                  {settings.examTitles.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </Field>
              <Field label="Class">
                <Select value={paper.className} onChange={(e) => update({ className: e.target.value })}>
                  {CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Subject">
                <Input list="subjects" value={paper.subject} onChange={(e) => update({ subject: e.target.value })} />
                <datalist id="subjects">
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Month">
                  <Select value={paper.month} onChange={(e) => update({ month: e.target.value })}>
                    {MONTHS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Year">
                  <Input value={paper.year} onChange={(e) => update({ year: e.target.value })} />
                </Field>
              </div>
              <Field label="Time allowed">
                <Input {...txtProps} value={paper.timeAllowed} onChange={(e) => update({ timeAllowed: e.target.value })} className={txtProps.className} />
              </Field>
              <Field label="Total marks" hint={`Auto-calculated: ${marks.total} marks across all enabled sections. Enter 0 for auto.`}>
                <Input type="number" min={0} value={paper.totalMarks} onChange={(e) => update({ totalMarks: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Paper language">
                <div className="grid grid-cols-2 gap-2">
                  {(["en", "ur"] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        paper.language === l ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white"
                      }`}
                    >
                      {l === "en" ? "English (LTR)" : <span className="font-urdu">اردو (RTL)</span>}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Student information">
                <div className="flex flex-wrap gap-4 pt-2">
                  <Toggle checked={paper.showStudentName} onChange={(v) => update({ showStudentName: v })} label="Name" />
                  <Toggle checked={paper.showRollNo} onChange={(v) => update({ showRollNo: v })} label="Roll No" />
                  <Toggle checked={paper.showSection} onChange={(v) => update({ showSection: v })} label="Section" />
                </div>
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-display text-lg font-bold">Copies per Sheet</h2>
            <div className="space-y-2">
              {COPY_MODES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => update({ copyMode: c.value })}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    paper.copyMode === c.value ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <CopyModeIcon mode={c.value} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{c.label}</span>
                    <span className="block text-xs text-slate-500">{c.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Field label={`Page margin: ${paper.marginMm} mm`}>
                <input
                  type="range"
                  min={4}
                  max={20}
                  value={paper.marginMm}
                  onChange={(e) => update({ marginMm: Number(e.target.value) })}
                  className="w-full accent-emerald-700"
                />
              </Field>
            </div>
          </Card>

          {/* Section ON/OFF Toggles & Options */}
          <div className="lg:col-span-3">
            <h2 className="mb-3 font-display text-lg font-bold text-slate-800">
              Optional Question Types & Sections (ON / OFF)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Turn any question type ON or OFF. Only enabled sections appear in the paper builder and final output.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. MCQs */}
              <SectionToggleCard
                title="Multiple Choice (MCQs)"
                enabled={paper.sections.mcq.enabled}
                onToggle={(v) => updateSection("mcq", { enabled: v })}
                marksEach={paper.sections.mcq.marksEach}
                onMarksChange={(v) => updateSection("mcq", { marksEach: v })}
                instructions={paper.sections.mcq.instructions}
                onInstructionsChange={(v) => updateSection("mcq", { instructions: v })}
                txtProps={txtProps}
              />

              {/* 2. Fill in the Blanks */}
              <SectionToggleCard
                title="Fill in the Blanks"
                enabled={!!paper.sections.blanks?.enabled}
                onToggle={(v) => updateSection("blanks", { enabled: v })}
                marksEach={paper.sections.blanks?.marksEach ?? 1}
                onMarksChange={(v) => updateSection("blanks", { marksEach: v })}
                instructions={paper.sections.blanks?.instructions ?? (ur ? "خالی جگہیں پُر کریں۔" : "Fill in the blanks.")}
                onInstructionsChange={(v) => updateSection("blanks", { instructions: v })}
                txtProps={txtProps}
              />

              {/* 3. Translation */}
              <SectionToggleCard
                title="Translation Questions"
                enabled={!!paper.sections.translation?.enabled}
                onToggle={(v) => updateSection("translation", { enabled: v })}
                marksEach={paper.sections.translation?.marksEach ?? 2}
                onMarksChange={(v) => updateSection("translation", { marksEach: v })}
                instructions={paper.sections.translation?.instructions ?? (ur ? "مندرجہ ذیل کا انگریزی میں ترجمہ کریں۔" : "Translate the following sentences into Urdu.")}
                onInstructionsChange={(v) => updateSection("translation", { instructions: v })}
                txtProps={txtProps}
                extra={
                  <div className="mt-2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Translate into:</label>
                    <select
                      className="w-full text-xs rounded border border-slate-300 p-1"
                      value={paper.sections.translation?.targetLang || (ur ? "en" : "ur")}
                      onChange={(e) => updateSection("translation", { targetLang: e.target.value as "ur" | "en" })}
                    >
                      <option value="ur">Urdu (اردو میں ترجمہ)</option>
                      <option value="en">English (انگریزی میں ترجمہ)</option>
                    </select>
                  </div>
                }
              />

              {/* 4. Paragraph / Passage */}
              <SectionToggleCard
                title="Paragraph / Comprehension"
                enabled={!!paper.sections.passage?.enabled}
                onToggle={(v) => updateSection("passage", { enabled: v })}
                marksEach={paper.sections.passage?.marksEach ?? 2}
                onMarksChange={(v) => updateSection("passage", { marksEach: v })}
                instructions={paper.sections.passage?.instructions ?? (ur ? "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔" : "Read the following paragraph carefully and answer the questions below.")}
                onInstructionsChange={(v) => updateSection("passage", { instructions: v })}
                txtProps={txtProps}
              />

              {/* 5. Mathematics & Equations */}
              <SectionToggleCard
                title="Mathematics / Equations"
                enabled={!!paper.sections.math?.enabled}
                onToggle={(v) => updateSection("math", { enabled: v })}
                marksEach={paper.sections.math?.marksEach ?? 4}
                onMarksChange={(v) => updateSection("math", { marksEach: v })}
                instructions={paper.sections.math?.instructions ?? (ur ? "درج ذیل حسابی سوالات اور مساوات حل کریں۔" : "Solve the following mathematical questions / equations.")}
                onInstructionsChange={(v) => updateSection("math", { instructions: v })}
                txtProps={txtProps}
              />

              {/* 6. Short Questions (Standard) */}
              <SectionToggleCard
                title="Short Questions (Standard)"
                enabled={paper.sections.short.enabled && !paper.sections.shortPartitions?.enabled}
                onToggle={(v) => {
                  updateSection("short", { enabled: v });
                  if (v) updateSection("shortPartitions", { enabled: false });
                }}
                marksEach={paper.sections.short.marksEach}
                onMarksChange={(v) => updateSection("short", { marksEach: v })}
                instructions={paper.sections.short.instructions}
                onInstructionsChange={(v) => updateSection("short", { instructions: v })}
                attempt={paper.sections.short.attempt}
                onAttemptChange={(v) => updateSection("short", { attempt: v })}
                txtProps={txtProps}
              />

              {/* 7. Short Question Partitions (Board Style) */}
              <SectionToggleCard
                title="Short Question Partitions (Board Style)"
                enabled={!!paper.sections.shortPartitions?.enabled}
                onToggle={(v) => {
                  updateSection("shortPartitions", { enabled: v });
                  if (v) updateSection("short", { enabled: false });
                }}
                marksEach={paper.sections.shortPartitions?.marksEach ?? 2}
                onMarksChange={(v) => updateSection("shortPartitions", { marksEach: v })}
                instructions={paper.sections.shortPartitions?.instructions ?? (ur ? "درج ذیل سوالات کے مختصر جوابات تحریر کریں۔" : "Write short answers to the following questions.")}
                onInstructionsChange={(v) => updateSection("shortPartitions", { instructions: v })}
                txtProps={txtProps}
                extra={
                  <p className="text-[11px] text-emerald-800 mt-1 font-medium">
                    Creates Q.2, Q.3, Q.4 partitions with configurable choice (e.g. attempt 5 out of 8).
                  </p>
                }
              />

              {/* 8. Long Questions */}
              <SectionToggleCard
                title="Long Questions"
                enabled={paper.sections.long.enabled}
                onToggle={(v) => updateSection("long", { enabled: v })}
                marksEach={paper.sections.long.marksEach}
                onMarksChange={(v) => updateSection("long", { marksEach: v })}
                instructions={paper.sections.long.instructions}
                onInstructionsChange={(v) => updateSection("long", { instructions: v })}
                attempt={paper.sections.long.attempt}
                onAttemptChange={(v) => updateSection("long", { attempt: v })}
                txtProps={txtProps}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Question Authoring */}
      {step === 2 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="space-y-5">
            {/* Quick Action Toolbar */}
            <Card className="flex flex-wrap items-center gap-2 !p-3">
              <button className={btn.secondary} onClick={() => setModal("bulk")}>
                <ClipboardPaste className="h-4 w-4" /> Bulk Paste
              </button>
              <button className={btn.secondary} onClick={() => setModal("bank")}>
                <Library className="h-4 w-4" /> From Question Bank
              </button>
              <button className={btn.secondary} onClick={() => setModal("ocr")}>
                <ScanText className="h-4 w-4" /> AI / OCR Scan
              </button>
              <button
                className={btn.secondary}
                onClick={autoCorrectAll}
                title="Auto-correct spelling & typing mistakes"
              >
                <Sparkles className="h-4 w-4 text-emerald-700" /> Auto-correct typos
              </button>
              <button className={`${btn.ghost} ml-auto`} onClick={saveToBank}>
                <BookPlus className="h-4 w-4" /> Save all to Bank
              </button>
            </Card>

            {/* Quick Section ON/OFF Switcher Bar */}
            <Card className="!p-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-emerald-100">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ListTree className="h-4 w-4 text-emerald-700" /> Active Question Types (Click to Toggle ON/OFF):
                </span>
                <span className="text-xs text-slate-500">
                  Total Questions:{" "}
                  <b>
                    {(paper.mcqs?.length || 0) +
                      (paper.blanks?.length || 0) +
                      (paper.translations?.length || 0) +
                      (paper.passages?.length || 0) +
                      (paper.maths?.length || 0) +
                      (paper.shorts?.length || 0) +
                      (paper.shortPartitions?.reduce((a, p) => a + (p.questions?.length || 0), 0) || 0) +
                      (paper.longs?.length || 0)}
                  </b>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "mcq", label: "MCQs", on: paper.sections.mcq.enabled },
                  { key: "blanks", label: "Fill in Blanks", on: !!paper.sections.blanks?.enabled },
                  { key: "translation", label: "Translation", on: !!paper.sections.translation?.enabled },
                  { key: "passage", label: "Passage / Comprehension", on: !!paper.sections.passage?.enabled },
                  { key: "math", label: "Mathematics", on: !!paper.sections.math?.enabled },
                  {
                    key: "short",
                    label: "Short Questions",
                    on: paper.sections.short.enabled && !paper.sections.shortPartitions?.enabled,
                  },
                  {
                    key: "shortPartitions",
                    label: "Short Partitions (Board)",
                    on: !!paper.sections.shortPartitions?.enabled,
                  },
                  { key: "long", label: "Long Questions", on: paper.sections.long.enabled },
                ].map(({ key, label, on }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === "shortPartitions") {
                        updateSection("shortPartitions", { enabled: !on });
                        if (!on) updateSection("short", { enabled: false });
                      } else if (key === "short") {
                        updateSection("short", { enabled: !on });
                        if (!on) updateSection("shortPartitions", { enabled: false });
                      } else {
                        updateSection(key as keyof PaperData["sections"], { enabled: !on });
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition shadow-sm ${
                      on
                        ? "bg-emerald-700 text-white ring-1 ring-emerald-800"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${on ? "bg-white" : "bg-slate-300"}`} />
                    {label}: {on ? "ON" : "OFF"}
                  </button>
                ))}
              </div>
            </Card>

            {/* 1. MCQs Section */}
            {paper.sections.mcq.enabled && (
              <EditorSection
                title="Section: Multiple Choice Questions (MCQs)"
                count={(paper.mcqs || []).length}
                marks={marks.mcq}
                color="sky"
                onAdd={() =>
                  update({ mcqs: [...(paper.mcqs || []), { id: uid(), text: "", options: ["", "", "", ""] }] })
                }
              >
                {(paper.mcqs || []).map((m, i) => (
                  <McqEditor
                    key={m.id}
                    n={i + 1}
                    q={m}
                    ur={ur}
                    onChange={(q) => update({ mcqs: (paper.mcqs || []).map((x) => (x.id === m.id ? q : x)) })}
                    onDelete={() => update({ mcqs: (paper.mcqs || []).filter((x) => x.id !== m.id) })}
                    onMove={(d) => update({ mcqs: move(paper.mcqs || [], i, d) })}
                  />
                ))}
              </EditorSection>
            )}

            {/* 2. Fill in the Blanks Section */}
            {paper.sections.blanks?.enabled && (
              <EditorSection
                title="Section: Fill in the Blanks"
                count={(paper.blanks || []).length}
                marks={marks.blanks}
                color="emerald"
                onAdd={() =>
                  update({
                    blanks: [...(paper.blanks || []), { id: uid(), text: "The sun rises in the ________." }],
                  })
                }
              >
                {(paper.blanks || []).map((b, i) => (
                  <BlankEditor
                    key={b.id}
                    n={i + 1}
                    q={b}
                    ur={ur}
                    onChange={(q) =>
                      update({ blanks: (paper.blanks || []).map((x) => (x.id === b.id ? q : x)) })
                    }
                    onDelete={() => update({ blanks: (paper.blanks || []).filter((x) => x.id !== b.id) })}
                    onMove={(d) => update({ blanks: move(paper.blanks || [], i, d) })}
                  />
                ))}
              </EditorSection>
            )}

            {/* 3. Translation Section */}
            {paper.sections.translation?.enabled && (
              <EditorSection
                title={`Section: Translation (${paper.sections.translation.targetLang === "en" ? "Translate into English" : "Translate into Urdu"})`}
                count={(paper.translations || []).length}
                marks={marks.translation}
                color="teal"
                onAdd={() =>
                  update({
                    translations: [
                      ...(paper.translations || []),
                      { id: uid(), text: "", marks: paper.sections.translation?.marksEach || 2 },
                    ],
                  })
                }
              >
                {(paper.translations || []).map((t, i) => (
                  <TranslationItemEditor
                    key={t.id}
                    n={i + 1}
                    item={t}
                    ur={ur}
                    onChange={(item) =>
                      update({
                        translations: (paper.translations || []).map((x) => (x.id === t.id ? item : x)),
                      })
                    }
                    onDelete={() =>
                      update({ translations: (paper.translations || []).filter((x) => x.id !== t.id) })
                    }
                    onMove={(d) => update({ translations: move(paper.translations || [], i, d) })}
                  />
                ))}
              </EditorSection>
            )}

            {/* 4. Paragraph / Passage-based Section */}
            {paper.sections.passage?.enabled && (
              <EditorSection
                title="Section: Paragraph / Passage Comprehension"
                count={(paper.passages || []).length}
                marks={marks.passage}
                color="indigo"
                onAdd={() =>
                  update({
                    passages: [
                      ...(paper.passages || []),
                      {
                        id: uid(),
                        title: "",
                        passageText: "",
                        subQuestions: [
                          { id: uid(), text: "What is the main theme of the passage?", marks: 2 },
                          { id: uid(), text: "What lesson do we learn from it?", marks: 2 },
                        ],
                      },
                    ],
                  })
                }
              >
                {(paper.passages || []).map((pass, i) => (
                  <PassageEditor
                    key={pass.id}
                    n={i + 1}
                    passage={pass}
                    ur={ur}
                    onChange={(pItem) =>
                      update({
                        passages: (paper.passages || []).map((x) => (x.id === pass.id ? pItem : x)),
                      })
                    }
                    onDelete={() =>
                      update({ passages: (paper.passages || []).filter((x) => x.id !== pass.id) })
                    }
                  />
                ))}
              </EditorSection>
            )}

            {/* 5. Mathematics & Equations Section */}
            {paper.sections.math?.enabled && (
              <EditorSection
                title="Section: Mathematics & Equations"
                count={(paper.maths || []).length}
                marks={marks.math}
                color="rose"
                onAdd={() =>
                  update({
                    maths: [
                      ...(paper.maths || []),
                      {
                        id: uid(),
                        text: "Solve the following equation:",
                        equation: "2x + 5 = 15",
                        marks: paper.sections.math?.marksEach || 4,
                        subParts: [],
                      },
                    ],
                  })
                }
              >
                <MathSymbolsBar />
                {(paper.maths || []).map((m, i) => (
                  <MathEditor
                    key={m.id}
                    n={i + 1}
                    q={m}
                    ur={ur}
                    onChange={(item) =>
                      update({ maths: (paper.maths || []).map((x) => (x.id === m.id ? item : x)) })
                    }
                    onDelete={() => update({ maths: (paper.maths || []).filter((x) => x.id !== m.id) })}
                    onMove={(d) => update({ maths: move(paper.maths || [], i, d) })}
                  />
                ))}
              </EditorSection>
            )}

            {/* 6. Short Question Partitions (Board Style) */}
            {paper.sections.shortPartitions?.enabled && (
              <EditorSection
                title="Section: Short Question Partitions (Board Pattern: Q.2, Q.3, Q.4...)"
                count={(paper.shortPartitions || []).length}
                marks={marks.short}
                color="amber"
                onAdd={() => {
                  const parts = paper.shortPartitions || [];
                  const newPart: ShortPartition = {
                    id: uid(),
                    title: `Partition ${parts.length + 1}`,
                    instructions: ur
                      ? "مندرجہ ذیل سوالات میں سے کوئی سے 5 سوالات کے مختصر جوابات لکھیں۔"
                      : "Write short answers to any 5 of the following questions.",
                    attempt: 5,
                    marksEach: 2,
                    questions: [
                      { id: uid(), text: "" },
                      { id: uid(), text: "" },
                      { id: uid(), text: "" },
                      { id: uid(), text: "" },
                      { id: uid(), text: "" },
                      { id: uid(), text: "" },
                      { id: uid(), text: "" },
                      { id: uid(), text: "" },
                    ],
                  };
                  update({ shortPartitions: [...parts, newPart] });
                }}
              >
                {(paper.shortPartitions || []).map((part, i) => (
                  <ShortPartitionEditor
                    key={part.id}
                    partitionNumber={i + 1}
                    part={part}
                    ur={ur}
                    onChange={(updatedPart) =>
                      update({
                        shortPartitions: (paper.shortPartitions || []).map((x) =>
                          x.id === part.id ? updatedPart : x
                        ),
                      })
                    }
                    onDelete={() =>
                      update({
                        shortPartitions: (paper.shortPartitions || []).filter((x) => x.id !== part.id),
                      })
                    }
                  />
                ))}
              </EditorSection>
            )}

            {/* 7. Standard Short Questions Section */}
            {paper.sections.short.enabled && !paper.sections.shortPartitions?.enabled && (
              <EditorSection
                title="Section: Short Questions"
                count={(paper.shorts || []).length}
                marks={marks.short}
                color="amber"
                onAdd={() =>
                  update({
                    shorts: [
                      ...(paper.shorts || []),
                      {
                        id: uid(),
                        text: "",
                        part:
                          paper.shorts.length && paper.sections.short.splitParts
                            ? paper.shorts[paper.shorts.length - 1].part
                            : "A",
                      },
                    ],
                  })
                }
              >
                {(paper.shorts || []).map((s, i) => (
                  <ShortEditor
                    key={s.id}
                    n={i + 1}
                    q={s}
                    ur={ur}
                    split={paper.sections.short.splitParts}
                    onChange={(q) =>
                      update({ shorts: (paper.shorts || []).map((x) => (x.id === s.id ? q : x)) })
                    }
                    onDelete={() => update({ shorts: (paper.shorts || []).filter((x) => x.id !== s.id) })}
                    onMove={(d) => update({ shorts: move(paper.shorts || [], i, d) })}
                  />
                ))}
              </EditorSection>
            )}

            {/* 8. Long Questions Section */}
            {paper.sections.long.enabled && (
              <EditorSection
                title="Section: Long / Detailed Questions"
                count={(paper.longs || []).length}
                marks={marks.long}
                color="violet"
                onAdd={() =>
                  update({
                    longs: [
                      ...(paper.longs || []),
                      { id: uid(), text: "", marks: paper.sections.long.marksEach, subParts: [] },
                    ],
                  })
                }
              >
                <div className="flex items-center gap-2 mb-2 p-2 rounded bg-slate-50 text-xs">
                  <span className="font-semibold text-slate-700">Attempt instruction:</span>
                  <label className="flex items-center gap-1.5">
                    <span>Attempt any</span>
                    <input
                      type="number"
                      min={0}
                      className="w-16 rounded border px-1.5 py-0.5 text-center font-bold"
                      value={paper.sections.long.attempt || 0}
                      onChange={(e) =>
                        updateSection("long", { attempt: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                    <span>questions (0 = attempt all)</span>
                  </label>
                </div>
                {(paper.longs || []).map((l, i) => (
                  <LongEditor
                    key={l.id}
                    n={i + 1}
                    q={l}
                    ur={ur}
                    onChange={(q) =>
                      update({ longs: (paper.longs || []).map((x) => (x.id === l.id ? q : x)) })
                    }
                    onDelete={() => update({ longs: (paper.longs || []).filter((x) => x.id !== l.id) })}
                    onMove={(d) => update({ longs: move(paper.longs || [], i, d) })}
                  />
                ))}
              </EditorSection>
            )}

            {/* Message if no sections enabled */}
            {!paper.sections.mcq.enabled &&
              !paper.sections.blanks?.enabled &&
              !paper.sections.translation?.enabled &&
              !paper.sections.passage?.enabled &&
              !paper.sections.math?.enabled &&
              !paper.sections.short.enabled &&
              !paper.sections.shortPartitions?.enabled &&
              !paper.sections.long.enabled && (
                <Card className="text-center text-slate-500 py-10">
                  <HelpCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  All sections are currently OFF. Turn any section ON above to start adding questions.
                </Card>
              )}
          </div>

          {/* Right side live A4 Preview */}
          <div className="hidden xl:block">
            <div className="sticky top-20">
              <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Live A4 preview</div>
              <ZoomablePaper paper={paper} initialZoom={0.5} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Preview & Export */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center gap-3 !p-4">
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
              {COPY_MODES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => update({ copyMode: c.value })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    paper.copyMode === c.value ? "bg-white text-emerald-800 shadow" : "text-slate-600"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <ExportActions paper={paper} ensureSaved={() => save(true)} onMessage={notify} compact />
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <button className={btn.ghost} onClick={saveToBank}>
              <BookPlus className="h-4 w-4" /> Save questions to Bank
            </button>
            <button className={btn.ghost} onClick={saveAsTemplate}>
              <LayoutTemplate className="h-4 w-4" /> Save layout as Template
            </button>
            {id && (
              <Link href={`/papers/${id}`} className={btn.ghost}>
                <Copy className="h-4 w-4" /> Open fullscreen preview
              </Link>
            )}
          </div>
          <ZoomablePaper paper={paper} initialZoom={0.85} fit />
        </div>
      )}

      {/* Footer Nav */}
      <div className="no-print flex items-center justify-between border-t pt-4">
        <button className={btn.secondary} disabled={step === 1} onClick={() => setStep(step - 1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 3 ? (
          <button
            className={btn.primary}
            onClick={() => {
              setStep(step + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Next: {STEPS[step]} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button className={btn.primary} onClick={() => save()} disabled={saving}>
            <Save className="h-4 w-4" /> Save Paper
          </button>
        )}
      </div>

      {modal === "bulk" && (
        <BulkPasteModal
          onClose={() => setModal("")}
          onInsert={insertQuestions}
          language={paper.language}
          defaultLongMarks={paper.sections.long.marksEach}
        />
      )}
      {modal === "bank" && (
        <QuestionBankModal
          onClose={() => setModal("")}
          onInsert={insertQuestions}
          subject={paper.subject}
          className={paper.className}
        />
      )}
      {modal === "ocr" && <OcrModal onClose={() => setModal("")} onInsert={insertQuestions} />}
      {toast && <Toast msg={toast.msg} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ---------------- Reusable Editor Components ---------------- */

function SectionToggleCard({
  title,
  enabled,
  onToggle,
  marksEach,
  onMarksChange,
  instructions,
  onInstructionsChange,
  attempt,
  onAttemptChange,
  txtProps,
  extra,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  marksEach?: number;
  onMarksChange?: (v: number) => void;
  instructions?: string;
  onInstructionsChange?: (v: string) => void;
  attempt?: number;
  onAttemptChange?: (v: number) => void;
  txtProps: { dir: "ltr" | "rtl"; className: string };
  extra?: ReactNode;
}) {
  return (
    <Card className={`transition ${enabled ? "border-emerald-300 ring-2 ring-emerald-600/10" : "opacity-60 bg-slate-50/50"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-slate-800">{title}</h3>
        <Toggle checked={enabled} onChange={onToggle} label="" />
      </div>
      {enabled ? (
        <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex gap-2">
            {onMarksChange && (
              <label className="flex-1">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase">Marks/Q</span>
                <Input
                  type="number"
                  min={1}
                  className="!py-1 !text-xs font-semibold"
                  value={marksEach ?? 1}
                  onChange={(e) => onMarksChange(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
            )}
            {onAttemptChange && (
              <label className="flex-1">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase">Attempt</span>
                <Input
                  type="number"
                  min={0}
                  className="!py-1 !text-xs font-semibold"
                  value={attempt ?? 0}
                  onChange={(e) => onAttemptChange(Math.max(0, Number(e.target.value) || 0))}
                  title="0 = attempt all"
                />
              </label>
            )}
          </div>
          {onInstructionsChange && (
            <div>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Instructions</span>
              <Input
                {...txtProps}
                className={`!py-1 !text-xs ${txtProps.className}`}
                value={instructions || ""}
                onChange={(e) => onInstructionsChange(e.target.value)}
              />
            </div>
          )}
          {extra}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 italic">Disabled — will not appear in paper.</div>
      )}
    </Card>
  );
}

const colorMap = {
  sky: "bg-sky-600",
  emerald: "bg-emerald-600",
  teal: "bg-teal-600",
  indigo: "bg-indigo-600",
  rose: "bg-rose-600",
  amber: "bg-amber-500",
  violet: "bg-violet-600",
};

function EditorSection({
  title,
  count,
  marks,
  color,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  marks: number;
  color: keyof typeof colorMap;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center gap-3 border-b bg-slate-50/50 px-5 py-3">
        <span className={`h-6 w-1.5 rounded-full ${colorMap[color]}`} />
        <h3 className="font-display font-bold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-500 font-medium">
          {count} item{count === 1 ? "" : "s"} · {marks} marks
        </span>
        <button className={`${btn.secondary} ml-auto !py-1.5`} onClick={onAdd}>
          <Plus className="h-4 w-4" /> Add Question
        </button>
      </div>
      <div className="space-y-3 p-4">
        {count === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            No questions added in this section yet. Click <b>Add Question</b> to create one.
          </p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

function RowTools({ onMove, onDelete }: { onMove?: (d: number) => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5">
      {onMove && (
        <>
          <button className={btn.icon} onClick={() => onMove(-1)} aria-label="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button className={btn.icon} onClick={() => onMove(1)} aria-label="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </>
      )}
      <button className={`${btn.icon} hover:!text-red-600`} onClick={onDelete} aria-label="Delete">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function McqEditor({
  n,
  q,
  ur,
  onChange,
  onDelete,
  onMove,
}: {
  n: number;
  q: MCQ;
  ur: boolean;
  onChange: (q: MCQ) => void;
  onDelete: () => void;
  onMove: (d: number) => void;
}) {
  const cls = ur ? "font-urdu leading-loose" : "";
  const lang = ur ? "ur" : "en";
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <span className="mt-2 w-6 shrink-0 text-sm font-bold text-slate-500">{n}.</span>
      <div className="min-w-0 flex-1 space-y-2">
        <Input
          dir={ur ? "rtl" : "ltr"}
          className={cls}
          placeholder="Question statement"
          value={q.text}
          onChange={(e) => onChange({ ...q, text: e.target.value })}
          onBlur={(e) => onChange({ ...q, text: correctQuestionText(e.target.value, lang) })}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o, j) => (
            <div key={j} className="flex items-center gap-1.5">
              <span className="w-5 text-xs font-bold text-slate-400">{"ABCDEF"[j]}</span>
              <Input
                dir={ur ? "rtl" : "ltr"}
                className={`!py-1.5 ${cls}`}
                placeholder={`Option ${"ABCDEF"[j]}`}
                value={o}
                onChange={(e) => onChange({ ...q, options: q.options.map((x, k) => (k === j ? e.target.value : x)) })}
                onBlur={(e) => onChange({ ...q, options: q.options.map((x, k) => (k === j ? correctQuestionText(e.target.value, lang) : x)) })}
              />
            </div>
          ))}
        </div>
      </div>
      <RowTools onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

/* 2. Fill in the Blanks Editor */
function BlankEditor({
  n,
  q,
  ur,
  onChange,
  onDelete,
  onMove,
}: {
  n: number;
  q: BlankQuestion;
  ur: boolean;
  onChange: (q: BlankQuestion) => void;
  onDelete: () => void;
  onMove: (d: number) => void;
}) {
  const cls = ur ? "font-urdu leading-loose" : "";
  const lang = ur ? "ur" : "en";

  const insertBlankPlaceholder = () => {
    const blankStr = "________";
    onChange({ ...q, text: q.text ? `${q.text} ${blankStr}` : blankStr });
  };

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <span className="mt-2 w-6 shrink-0 text-sm font-bold text-slate-500">{n}.</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex gap-2">
          <Input
            dir={ur ? "rtl" : "ltr"}
            className={cls}
            placeholder={ur ? "مثلاً: پاکستان کا دارالحکومت ________ ہے۔" : "e.g. The sun rises in the ________."}
            value={q.text}
            onChange={(e) => onChange({ ...q, text: e.target.value })}
            onBlur={(e) => onChange({ ...q, text: correctQuestionText(e.target.value, lang) })}
          />
          <button
            type="button"
            onClick={insertBlankPlaceholder}
            className="shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            title="Insert ________ into question"
          >
            + Blank (____)
          </button>
        </div>
        <div className="text-[11px] text-slate-400">
          Tip: Type underscores (e.g. <code className="bg-slate-100 px-1 rounded">________</code>) where you want the student to fill in the blank.
        </div>
      </div>
      <RowTools onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

/* 3. Translation Item Editor */
function TranslationItemEditor({
  n,
  item,
  ur,
  onChange,
  onDelete,
  onMove,
}: {
  n: number;
  item: TranslationItem;
  ur: boolean;
  onChange: (item: TranslationItem) => void;
  onDelete: () => void;
  onMove: (d: number) => void;
}) {
  const cls = ur ? "font-urdu leading-loose" : "";
  const lang = ur ? "ur" : "en";
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <span className="mt-2 w-6 shrink-0 text-sm font-bold text-slate-500">{n}.</span>
      <div className="min-w-0 flex-1 space-y-1">
        <Textarea
          rows={2}
          dir={ur ? "rtl" : "ltr"}
          className={cls}
          placeholder="Sentence or passage to translate..."
          value={item.text}
          onChange={(e) => onChange({ ...item, text: e.target.value })}
          onBlur={(e) => onChange({ ...item, text: correctQuestionText(e.target.value, lang) })}
        />
      </div>
      <RowTools onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

/* 4. Passage / Paragraph Comprehension Editor */
function PassageEditor({
  n,
  passage,
  ur,
  onChange,
  onDelete,
}: {
  n: number;
  passage: PassageQuestion;
  ur: boolean;
  onChange: (p: PassageQuestion) => void;
  onDelete: () => void;
}) {
  const cls = ur ? "font-urdu leading-loose" : "";
  const lang = ur ? "ur" : "en";

  const addSubQuestion = () => {
    onChange({
      ...passage,
      subQuestions: [
        ...(passage.subQuestions || []),
        { id: uid(), text: "", marks: 2 },
      ],
    });
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
        <span className="font-bold text-indigo-900 text-sm">Passage #{n}</span>
        <button className="text-xs text-red-600 font-semibold hover:underline" onClick={onDelete}>
          Delete Passage
        </button>
      </div>
      <div className="space-y-2">
        <Input
          placeholder="Optional Passage Title (e.g. The Honest Woodcutter)"
          value={passage.title || ""}
          onChange={(e) => onChange({ ...passage, title: e.target.value })}
        />
        <Textarea
          rows={4}
          dir={ur ? "rtl" : "ltr"}
          className={cls}
          placeholder="Paste or write the complete paragraph / reading passage here..."
          value={passage.passageText}
          onChange={(e) => onChange({ ...passage, passageText: e.target.value })}
          onBlur={(e) => onChange({ ...passage, passageText: correctQuestionText(e.target.value, lang) })}
        />
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase">Sub-Questions based on this passage:</span>
          <button
            type="button"
            className="text-xs font-semibold text-indigo-700 hover:underline"
            onClick={addSubQuestion}
          >
            + Add Sub-Question
          </button>
        </div>
        <div className="space-y-2">
          {(passage.subQuestions || []).map((sq, sqIdx) => (
            <div key={sq.id} className="flex items-center gap-2 ps-2">
              <span className="w-6 text-xs font-bold text-slate-500">({sqIdx + 1})</span>
              <Input
                dir={ur ? "rtl" : "ltr"}
                className={`!py-1.5 flex-1 ${cls}`}
                placeholder="Question based on the passage..."
                value={sq.text}
                onChange={(e) =>
                  onChange({
                    ...passage,
                    subQuestions: passage.subQuestions.map((x) =>
                      x.id === sq.id ? { ...x, text: e.target.value } : x
                    ),
                  })
                }
                onBlur={(e) =>
                  onChange({
                    ...passage,
                    subQuestions: passage.subQuestions.map((x) =>
                      x.id === sq.id ? { ...x, text: correctQuestionText(e.target.value, lang) } : x
                    ),
                  })
                }
              />
              <Input
                type="number"
                min={1}
                className="!w-16 !py-1.5 text-center text-xs"
                title="Marks"
                value={sq.marks}
                onChange={(e) =>
                  onChange({
                    ...passage,
                    subQuestions: passage.subQuestions.map((x) =>
                      x.id === sq.id ? { ...x, marks: Number(e.target.value) || 1 } : x
                    ),
                  })
                }
              />
              <button
                className={`${btn.icon} hover:!text-red-600`}
                onClick={() =>
                  onChange({
                    ...passage,
                    subQuestions: passage.subQuestions.filter((x) => x.id !== sq.id),
                  })
                }
                aria-label="Remove sub-question"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 5. Mathematics & Equations Editor */
function MathSymbolsBar() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 mb-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        Math Symbols Quick Palette (Click to copy / insert):
      </div>
      <div className="flex flex-wrap gap-1">
        {MATH_SYMBOLS.map((sym) => (
          <button
            key={sym.label}
            type="button"
            className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-bold text-slate-800 hover:bg-emerald-50 hover:border-emerald-300"
            onClick={() => {
              navigator.clipboard?.writeText(sym.insert.trim());
            }}
            title={`Copy ${sym.label}`}
          >
            {sym.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MathEditor({
  n,
  q,
  ur,
  onChange,
  onDelete,
  onMove,
}: {
  n: number;
  q: MathQuestion;
  ur: boolean;
  onChange: (q: MathQuestion) => void;
  onDelete: () => void;
  onMove: (d: number) => void;
}) {
  const cls = ur ? "font-urdu leading-loose" : "";
  const lang = ur ? "ur" : "en";
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <span className="mt-2 w-6 shrink-0 text-sm font-bold text-slate-500">{n}.</span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-2">
          <Input
            dir={ur ? "rtl" : "ltr"}
            className={cls}
            placeholder="Statement (e.g. Solve the following equation for x:)"
            value={q.text}
            onChange={(e) => onChange({ ...q, text: e.target.value })}
            onBlur={(e) => onChange({ ...q, text: correctQuestionText(e.target.value, lang) })}
          />
          <Input
            type="number"
            min={1}
            className="!w-20 text-center font-bold"
            title="Marks"
            value={q.marks}
            onChange={(e) => onChange({ ...q, marks: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
        <div>
          <Input
            className="font-mono font-bold text-slate-900 tracking-wider"
            placeholder="Equation / formula (e.g. 2x² + 5x - 3 = 0  or  3/4 + 2/5 = ?)"
            value={q.equation || ""}
            onChange={(e) => onChange({ ...q, equation: e.target.value })}
          />
        </div>
      </div>
      <RowTools onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

/* 6. Short Question Partitions Editor (Board Style) */
function ShortPartitionEditor({
  partitionNumber,
  part,
  ur,
  onChange,
  onDelete,
}: {
  partitionNumber: number;
  part: ShortPartition;
  ur: boolean;
  onChange: (part: ShortPartition) => void;
  onDelete: () => void;
}) {
  const cls = ur ? "font-urdu leading-loose" : "";
  const lang = ur ? "ur" : "en";

  const addQuestion = () => {
    onChange({
      ...part,
      questions: [...(part.questions || []), { id: uid(), text: "" }],
    });
  };

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/20 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-900 text-sm">
            Partition #{partitionNumber} (Q.{partitionNumber + 1})
          </span>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            Total: {part.questions?.length || 0} Questions
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>Attempt:</span>
            <input
              type="number"
              min={1}
              className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center font-bold"
              value={part.attempt}
              onChange={(e) => onChange({ ...part, attempt: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <span>Marks/Q:</span>
            <input
              type="number"
              min={1}
              className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center font-bold"
              value={part.marksEach}
              onChange={(e) => onChange({ ...part, marksEach: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <button className="text-xs text-red-600 font-semibold hover:underline" onClick={onDelete}>
            Delete Partition
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Partition Instructions:</label>
        <Input
          dir={ur ? "rtl" : "ltr"}
          className={cls}
          placeholder={
            ur
              ? `مندرجہ ذیل ${part.questions?.length || 0} میں سے کوئی سے ${part.attempt} سوالات کے مختصر جوابات لکھیں۔`
              : `Write short answers to any ${part.attempt} of the following ${part.questions?.length || 0} questions.`
          }
          value={part.instructions || ""}
          onChange={(e) => onChange({ ...part, instructions: e.target.value })}
        />
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase">Questions in this partition:</span>
          <button type="button" className="text-xs font-semibold text-emerald-700 hover:underline" onClick={addQuestion}>
            + Add Question to Partition
          </button>
        </div>
        {(part.questions || []).map((q, qIdx) => (
          <div key={q.id} className="flex items-center gap-2">
            <span className="w-6 text-xs font-bold text-slate-500">({qIdx + 1})</span>
            <Input
              dir={ur ? "rtl" : "ltr"}
              className={`!py-1.5 flex-1 ${cls}`}
              placeholder={`Question ${qIdx + 1}...`}
              value={q.text}
              onChange={(e) =>
                onChange({
                  ...part,
                  questions: part.questions.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)),
                })
              }
              onBlur={(e) =>
                onChange({
                  ...part,
                  questions: part.questions.map((x) =>
                    x.id === q.id ? { ...x, text: correctQuestionText(e.target.value, lang) } : x
                  ),
                })
              }
            />
            <button
              className={`${btn.icon} hover:!text-red-600`}
              onClick={() =>
                onChange({
                  ...part,
                  questions: part.questions.filter((x) => x.id !== q.id),
                })
              }
              aria-label="Remove question"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 7. Standard Short Questions Editor */
function ShortEditor({
  n,
  q,
  ur,
  split,
  onChange,
  onDelete,
  onMove,
}: {
  n: number;
  q: ShortQuestion;
  ur: boolean;
  split: boolean;
  onChange: (q: ShortQuestion) => void;
  onDelete: () => void;
  onMove: (d: number) => void;
}) {
  const lang = ur ? "ur" : "en";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <span className="mt-2 w-6 shrink-0 text-sm font-bold text-slate-500">{n}.</span>
      <Textarea
        rows={1}
        dir={ur ? "rtl" : "ltr"}
        className={`min-h-10 ${ur ? "font-urdu leading-loose" : ""}`}
        placeholder="Short question"
        value={q.text}
        onChange={(e) => onChange({ ...q, text: e.target.value })}
        onBlur={(e) => onChange({ ...q, text: correctQuestionText(e.target.value, lang) })}
      />
      {split && (
        <select
          className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          value={q.part}
          onChange={(e) => onChange({ ...q, part: e.target.value as "A" | "B" })}
        >
          <option value="A">Part A</option>
          <option value="B">Part B</option>
        </select>
      )}
      <RowTools onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

/* 8. Long Questions Editor */
function LongEditor({
  n,
  q,
  ur,
  onChange,
  onDelete,
  onMove,
}: {
  n: number;
  q: LongQuestion;
  ur: boolean;
  onChange: (q: LongQuestion) => void;
  onDelete: () => void;
  onMove: (d: number) => void;
}) {
  const cls = ur ? "font-urdu leading-loose" : "";
  const lang = ur ? "ur" : "en";
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <span className="mt-2 w-6 shrink-0 text-sm font-bold text-slate-500">Q{n}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-2">
          <Textarea
            rows={2}
            dir={ur ? "rtl" : "ltr"}
            className={cls}
            placeholder="Long question / topic heading"
            value={q.text}
            onChange={(e) => onChange({ ...q, text: e.target.value })}
            onBlur={(e) => onChange({ ...q, text: correctQuestionText(e.target.value, lang) })}
          />
          <div className="w-24 shrink-0">
            <Input
              type="number"
              min={1}
              title="Marks"
              disabled={q.subParts.length > 0}
              value={q.subParts.length ? longMarks(q) : q.marks}
              onChange={(e) => onChange({ ...q, marks: Math.max(1, Number(e.target.value) || 1) })}
            />
            <span className="text-[10px] text-slate-400">{q.subParts.length ? "sum of parts" : "marks"}</span>
          </div>
        </div>
        {q.subParts.map((s, j) => (
          <div key={s.id} className="flex items-center gap-2 ps-4">
            <span className="w-6 text-xs font-bold text-slate-400">({"abcdef"[j]})</span>
            <Input
              dir={ur ? "rtl" : "ltr"}
              className={`!py-1.5 ${cls}`}
              placeholder="Sub-part"
              value={s.text}
              onChange={(e) =>
                onChange({
                  ...q,
                  subParts: q.subParts.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)),
                })
              }
              onBlur={(e) =>
                onChange({
                  ...q,
                  subParts: q.subParts.map((x) =>
                    x.id === s.id ? { ...x, text: correctQuestionText(e.target.value, lang) } : x
                  ),
                })
              }
            />
            <Input
              type="number"
              min={0}
              className="!w-20 !py-1.5"
              value={s.marks}
              onChange={(e) =>
                onChange({
                  ...q,
                  subParts: q.subParts.map((x) =>
                    x.id === s.id ? { ...x, marks: Math.max(0, Number(e.target.value) || 0) } : x
                  ),
                })
              }
            />
            <button
              className={`${btn.icon} hover:!text-red-600`}
              onClick={() => onChange({ ...q, subParts: q.subParts.filter((x) => x.id !== s.id) })}
              aria-label="Remove sub-part"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          className="ms-4 text-xs font-semibold text-emerald-700 hover:underline"
          onClick={() =>
            onChange({
              ...q,
              subParts: [...q.subParts, { id: uid(), text: "", marks: q.subParts.length ? 0 : q.marks }],
            })
          }
        >
          + Add sub-part
        </button>
      </div>
      <RowTools onMove={onMove} onDelete={onDelete} />
    </div>
  );
}
