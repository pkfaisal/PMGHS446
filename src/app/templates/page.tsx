"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { SchoolSettings, TemplateRecord } from "@/types/paper";
import { COPY_MODES, DEFAULT_SETTINGS, applyTemplate, createDefaultPaper, samplePaper } from "@/lib/paper";
import { Card, btn } from "@/components/ui";
import PaperSheet from "@/components/PaperSheet";

const URDU_SAMPLE = {
  mcqs: [
    { id: "u1", text: "پاکستان کا قومی پھول کون سا ہے؟", options: ["گلاب", "چنبیلی", "سورج مکھی", "کنول"] },
    { id: "u2", text: "قائداعظم کس سال پیدا ہوئے؟", options: ["۱۸۷۶ء", "۱۸۷۷ء", "۱۹۰۶ء", "۱۸۵۷ء"] },
    { id: "u3", text: "پنجاب کا دارالحکومت ہے:", options: ["لاہور", "کراچی", "پشاور", "کوئٹہ"] },
  ],
  shorts: [
    { id: "u4", text: "اسم کی تعریف کریں۔", part: "A" as const },
    { id: "u5", text: "فعل کی اقسام لکھیں۔", part: "A" as const },
    { id: "u6", text: "محاورہ اور ضرب المثل میں فرق واضح کریں۔", part: "B" as const },
  ],
  longs: [{ id: "u7", text: "علامہ اقبال پر ایک مضمون لکھیں۔", marks: 5, subParts: [] }],
};

function TemplateThumb({ t, settings }: { t: TemplateRecord; settings: SchoolSettings }) {
  const paper = useMemo(() => {
    let p = applyTemplate(createDefaultPaper(settings), t.config);
    if (t.config.language === "ur") p = { ...p, schoolName: settings.schoolNameUrdu, subject: "Urdu", ...URDU_SAMPLE };
    else p = samplePaper(p);
    return p;
  }, [t, settings]);
  const scale = 0.32;
  return (
    <div className="relative mx-auto overflow-hidden rounded-lg bg-slate-200 ring-1 ring-black/5" style={{ width: 794 * scale, height: 1123 * scale * (t.config.copyMode === "2pages" ? 1 : 1) }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 794 }} className="pointer-events-none">
        <PaperSheet paper={paper} showBadges={false} shadow={false} />
      </div>
      {t.config.copyMode === "2pages" && <span className="absolute right-2 top-2 rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-bold text-white">×2 pages</span>}
    </div>
  );
}

export default function TemplatesPage() {
  const [items, setItems] = useState<TemplateRecord[] | null>(null);
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);

  const load = () =>
    api.templates
      .list()
      .then(setItems)
      .catch(() => setItems([]));

  useEffect(() => {
    load();
    api.settings.get().then(setSettings).catch(() => null);
  }, []);

  const remove = async (t: TemplateRecord) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await api.templates.remove(t.id);
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Template Gallery</h1>
        <p className="text-sm text-slate-500">Choose a layout to start a new paper. Save your own layouts from Step 3 of the paper wizard.</p>
      </div>
      {!items ? (
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="flex flex-col !p-4">
              <TemplateThumb t={t} settings={settings} />
              <div className="mt-4 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-slate-800">{t.name}</h3>
                  <p className="text-xs text-slate-500">{t.description}</p>
                </div>
                {t.builtIn ? (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Built-in</span>
                ) : (
                  <button className={`${btn.icon} hover:!text-red-600`} onClick={() => remove(t)} aria-label="Delete template">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded bg-slate-100 px-1.5 py-0.5">{COPY_MODES.find((c) => c.value === t.config.copyMode)?.label}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">{t.config.language === "ur" ? "Urdu" : "English"}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5">{t.config.timeAllowed}</span>
              </div>
              <Link href={`/create?template=${t.id}`} className={`${btn.primary} mt-4`}>
                <LayoutTemplate className="h-4 w-4" /> Use this template
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
