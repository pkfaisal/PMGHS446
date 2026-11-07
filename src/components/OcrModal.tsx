"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ImageUp, Loader2, ScanText } from "lucide-react";
import { Modal, btn } from "./ui";
import { api, type OcrResult } from "@/lib/api";
import { uid, type ParsedQuestions } from "@/lib/paper";

export default function OcrModal({ onClose, onInsert }: { onClose: () => void; onInsert: (q: ParsedQuestions) => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OcrResult | null>(null);

  useEffect(() => {
    api.ocr
      .status()
      .then((r) => setConfigured(r.configured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const scan = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.ocr.extract(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  };

  const insert = () => {
    if (!result) return;
    onInsert({
      mcqs: result.mcqs.map((m) => {
        const options = [...(m.options ?? [])];
        while (options.length < 4) options.push("");
        return { id: uid(), text: m.text, options: options.slice(0, 6) };
      }),
      shorts: result.shorts.map((s) => ({ id: uid(), text: s.text, part: "A" as const })),
      longs: result.longs.map((l) => ({
        id: uid(),
        text: l.text,
        marks: l.marks || 5,
        subParts: (l.subParts ?? []).map((s) => ({ id: uid(), text: s.text, marks: s.marks || 0 })),
      })),
    });
  };

  const count = result ? result.mcqs.length + result.shorts.length + result.longs.length : 0;
  const ur = result?.language === "ur";

  return (
    <Modal
      wide
      title={
        <span className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-emerald-700" /> AI / OCR Question Scanner
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          {result ? (
            <button className={btn.primary} disabled={!count} onClick={insert}>
              Insert {count} questions
            </button>
          ) : (
            <button className={btn.primary} disabled={!file || busy || configured === false} onClick={scan}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
              {busy ? "Scanning with Gemini…" : "Scan Image"}
            </button>
          )}
        </>
      }
    >
      {configured === false && (
        <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            AI scanning is not configured on this server. Add a <code className="rounded bg-amber-100 px-1">GEMINI_API_KEY</code> environment
            variable to enable Google Gemini Vision extraction. Meanwhile you can type or use <b>Bulk Paste</b>.
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-emerald-500">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Upload preview" className="max-h-80 rounded-lg object-contain" />
          ) : (
            <>
              <ImageUp className="mb-2 h-10 w-10 text-slate-400" />
              <span className="font-semibold text-slate-700">Upload a textbook page or old paper</span>
              <span className="text-xs text-slate-500">JPG, PNG or WEBP · max 10 MB · English or Urdu</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </label>
        <div className="rounded-xl border bg-slate-50 p-3 text-sm">
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Extracted questions</div>
          {error && <p className="text-red-600">{error}</p>}
          {!result && !error && <p className="text-slate-400">Results from Gemini Vision appear here for review before inserting.</p>}
          {result && (
            <div className={`space-y-2 ${ur ? "font-urdu text-right leading-loose" : ""}`} dir={ur ? "rtl" : "ltr"}>
              {result.mcqs.map((m, i) => (
                <div key={`m${i}`} className="rounded bg-white p-2 shadow-sm">
                  <b className="text-sky-700">MCQ</b> {m.text}
                  <div className="text-xs text-slate-500">{m.options.join(" · ")}</div>
                </div>
              ))}
              {result.shorts.map((s, i) => (
                <div key={`s${i}`} className="rounded bg-white p-2 shadow-sm">
                  <b className="text-amber-700">Short</b> {s.text}
                </div>
              ))}
              {result.longs.map((l, i) => (
                <div key={`l${i}`} className="rounded bg-white p-2 shadow-sm">
                  <b className="text-violet-700">Long</b> {l.text}
                </div>
              ))}
              {count === 0 && <p className="text-slate-400">No questions detected in this image.</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
