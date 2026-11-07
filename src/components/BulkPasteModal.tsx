"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Modal, Select, Textarea, btn } from "./ui";
import { parseBulkText, type ParsedQuestions } from "@/lib/paper";
import type { Language } from "@/types/paper";

const EXAMPLE = `1. The SI unit of power is:
(a) Joule (b) Watt (c) Newton (d) Pascal
2. Which one is a scalar quantity?
a) Velocity
b) Force
c) Speed
d) Displacement
3. Define work.
4. What is meant by uniform motion?
5. Explain Newton's laws of motion. (5)
(a) State the first law. (2)
(b) Derive F = ma. (3)`;

export default function BulkPasteModal({
  onClose,
  onInsert,
  language,
  defaultLongMarks,
}: {
  onClose: () => void;
  onInsert: (q: ParsedQuestions) => void;
  language: Language;
  defaultLongMarks: number;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"auto" | "mcq" | "short" | "long">("auto");
  const parsed = useMemo(() => (text.trim() ? parseBulkText(text, mode, defaultLongMarks) : null), [text, mode, defaultLongMarks]);
  const count = parsed ? parsed.mcqs.length + parsed.shorts.length + parsed.longs.length : 0;

  return (
    <Modal
      wide
      title={
        <span className="flex items-center gap-2">
          <ClipboardPaste className="h-5 w-5 text-emerald-700" /> Bulk Paste Questions
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          <button className={btn.primary} disabled={!count} onClick={() => parsed && onInsert(parsed)}>
            Insert {count || ""} question{count === 1 ? "" : "s"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="w-auto">
              <option value="auto">Auto-detect type</option>
              <option value="mcq">All MCQs</option>
              <option value="short">All Short Questions</option>
              <option value="long">All Long Questions</option>
            </Select>
            <button className={btn.ghost} onClick={() => setText(EXAMPLE)}>
              Load example
            </button>
          </div>
          <Textarea
            rows={16}
            dir={language === "ur" ? "rtl" : "ltr"}
            className={`font-mono text-xs ${language === "ur" ? "font-urdu text-base leading-loose" : ""}`}
            placeholder={"Paste questions here…\nNumbered lines start new questions.\nOptions: (a) (b) (c) (d) inline or on separate lines.\nMarks: (5) or [5] at end of line."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="rounded-xl border bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
            <span>Live parse preview</span>
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800 font-bold lowercase">
              ✓ auto-correction active
            </span>
          </div>
          {!parsed && <p className="text-sm text-slate-400">Detected questions will appear here.</p>}
          {parsed && (
            <div className={`space-y-3 text-sm ${language === "ur" ? "font-urdu text-right" : ""}`} dir={language === "ur" ? "rtl" : "ltr"}>
              {parsed.mcqs.length > 0 && (
                <div>
                  <div className="mb-1 font-semibold text-sky-700">MCQs ({parsed.mcqs.length})</div>
                  {parsed.mcqs.map((m, i) => (
                    <div key={m.id} className="mb-1 rounded bg-white p-2 shadow-sm">
                      <div>
                        {i + 1}. {m.text}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{m.options.filter(Boolean).join("  ·  ") || "— no options detected —"}</div>
                    </div>
                  ))}
                </div>
              )}
              {parsed.shorts.length > 0 && (
                <div>
                  <div className="mb-1 font-semibold text-amber-700">Short ({parsed.shorts.length})</div>
                  {parsed.shorts.map((s, i) => (
                    <div key={s.id} className="mb-1 rounded bg-white p-2 shadow-sm">
                      {i + 1}. {s.text}
                    </div>
                  ))}
                </div>
              )}
              {parsed.longs.length > 0 && (
                <div>
                  <div className="mb-1 font-semibold text-violet-700">Long ({parsed.longs.length})</div>
                  {parsed.longs.map((l, i) => (
                    <div key={l.id} className="mb-1 rounded bg-white p-2 shadow-sm">
                      <div>
                        {i + 1}. {l.text} <span className="text-xs text-slate-500">({l.marks})</span>
                      </div>
                      {l.subParts.map((s) => (
                        <div key={s.id} className="ps-4 text-xs text-slate-600">
                          • {s.text} ({s.marks})
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
