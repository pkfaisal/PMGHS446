"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, Save, X } from "lucide-react";
import { api } from "@/lib/api";
import type { CopyMode, Language, SchoolSettings } from "@/types/paper";
import { COPY_MODES, DEFAULT_SETTINGS, createDefaultPaper, samplePaper } from "@/lib/paper";
import { Card, Field, Input, Select, Textarea, Toast, btn } from "@/components/ui";
import { ZoomablePaper } from "@/components/PaperPreviewPane";

export default function SettingsPage() {
  const [s, setS] = useState<SchoolSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  useEffect(() => {
    api.settings
      .get()
      .then(setS)
      .catch(() => setS(DEFAULT_SETTINGS));
  }, []);

  const preview = useMemo(() => (s ? samplePaper(createDefaultPaper(s)) : null), [s]);

  if (!s || !preview)
    return (
      <div className="flex justify-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const set = (patch: Partial<SchoolSettings>) => setS({ ...s, ...patch });
  const save = async () => {
    setSaving(true);
    try {
      setS(await api.settings.save(s));
      setToast({ msg: "Settings saved", kind: "ok" });
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "Save failed", kind: "err" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500">School branding, default layout and exam labels used for every new paper.</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className={btn.ghost} onClick={() => setS({ ...DEFAULT_SETTINGS })}>
            <RotateCcw className="h-4 w-4" /> Reset defaults
          </button>
          <button className={btn.primary} onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Settings
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-display text-lg font-bold">School Branding</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School name (English)">
                <Input value={s.schoolName} onChange={(e) => set({ schoolName: e.target.value })} />
              </Field>
              <Field label="School name (Urdu)">
                <Input dir="rtl" className="font-urdu leading-loose" value={s.schoolNameUrdu} onChange={(e) => set({ schoolNameUrdu: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <Input value={s.address} onChange={(e) => set({ address: e.target.value })} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-lg font-bold">Default Layout</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default language">
                <Select value={s.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value as Language })}>
                  <option value="en">English</option>
                  <option value="ur">Urdu (اردو)</option>
                </Select>
              </Field>
              <Field label="Default copies">
                <Select value={s.defaultCopyMode} onChange={(e) => set({ defaultCopyMode: e.target.value as CopyMode })}>
                  {COPY_MODES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Default page margin: ${s.defaultMarginMm} mm`}>
                <input type="range" min={4} max={20} value={s.defaultMarginMm} onChange={(e) => set({ defaultMarginMm: Number(e.target.value) })} className="w-full accent-emerald-700" />
              </Field>
              <Field label="Default time allowed">
                <Input value={s.defaultTimeAllowed} onChange={(e) => set({ defaultTimeAllowed: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-lg font-bold">Exam Labels</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {s.examTitles.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                  {t}
                  <button onClick={() => set({ examTitles: s.examTitles.filter((x) => x !== t) })} aria-label={`Remove ${t}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newTitle.trim() && !s.examTitles.includes(newTitle.trim())) set({ examTitles: [...s.examTitles, newTitle.trim()] });
                setNewTitle("");
              }}
            >
              <Input placeholder="Add exam title, e.g. Send-up Exam" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <button className={btn.secondary}>Add</button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-lg font-bold">Default Section Instructions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="MCQs (English)">
                <Textarea rows={2} value={s.mcqInstructions} onChange={(e) => set({ mcqInstructions: e.target.value })} />
              </Field>
              <Field label="MCQs (Urdu)">
                <Textarea rows={2} dir="rtl" className="font-urdu leading-loose" value={s.mcqInstructionsUrdu} onChange={(e) => set({ mcqInstructionsUrdu: e.target.value })} />
              </Field>
              <Field label="Short questions (English)">
                <Textarea rows={2} value={s.shortInstructions} onChange={(e) => set({ shortInstructions: e.target.value })} />
              </Field>
              <Field label="Short questions (Urdu)">
                <Textarea rows={2} dir="rtl" className="font-urdu leading-loose" value={s.shortInstructionsUrdu} onChange={(e) => set({ shortInstructionsUrdu: e.target.value })} />
              </Field>
              <Field label="Long questions (English)">
                <Textarea rows={2} value={s.longInstructions} onChange={(e) => set({ longInstructions: e.target.value })} />
              </Field>
              <Field label="Long questions (Urdu)">
                <Textarea rows={2} dir="rtl" className="font-urdu leading-loose" value={s.longInstructionsUrdu} onChange={(e) => set({ longInstructionsUrdu: e.target.value })} />
              </Field>
              <Field label="Fill in the Blanks (English)">
                <Textarea rows={2} value={s.blanksInstructions || ""} onChange={(e) => set({ blanksInstructions: e.target.value })} />
              </Field>
              <Field label="Fill in the Blanks (Urdu)">
                <Textarea rows={2} dir="rtl" className="font-urdu leading-loose" value={s.blanksInstructionsUrdu || ""} onChange={(e) => set({ blanksInstructionsUrdu: e.target.value })} />
              </Field>
              <Field label="Translation (English)">
                <Textarea rows={2} value={s.translationInstructions || ""} onChange={(e) => set({ translationInstructions: e.target.value })} />
              </Field>
              <Field label="Translation (Urdu)">
                <Textarea rows={2} dir="rtl" className="font-urdu leading-loose" value={s.translationInstructionsUrdu || ""} onChange={(e) => set({ translationInstructionsUrdu: e.target.value })} />
              </Field>
            </div>
          </Card>
        </div>
        <div className="hidden xl:block">
          <div className="sticky top-20">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Sample paper with these defaults</div>
            <ZoomablePaper paper={preview} initialZoom={0.48} />
          </div>
        </div>
      </div>
      {toast && <Toast msg={toast.msg} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}
