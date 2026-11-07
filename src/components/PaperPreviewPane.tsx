"use client";

import { useEffect, useRef, useState } from "react";
import { FileDown, FileType2, Loader2, Maximize2, Minus, Plus, Printer } from "lucide-react";
import PaperSheet, { PrintPortal } from "./PaperSheet";
import { btn } from "./ui";
import type { PaperData } from "@/types/paper";
import { exportPagesToPdf } from "@/lib/pdfExport";
import { printPaper } from "@/lib/printHelper";
import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { paperFileName } from "@/lib/paper";

/** Zoomable on-screen A4 preview */
export function ZoomablePaper({ paper, initialZoom = 0.75, fit = false }: { paper: PaperData; initialZoom?: number; fit?: boolean }) {
  const [zoom, setZoom] = useState(initialZoom);
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!fit || !box.current) return;
    const w = box.current.clientWidth;
    setZoom(Math.min(1, Math.max(0.35, (w - 24) / 794)));
  }, [fit]);

  const fitWidth = () => {
    if (box.current) setZoom(Math.min(1.5, Math.max(0.3, (box.current.clientWidth - 24) / 794)));
  };

  return (
    <div className="relative">
      <div className="no-print sticky top-16 z-10 mb-3 flex justify-center">
        <div className="flex items-center gap-1 rounded-full border bg-white/95 px-2 py-1 shadow-sm backdrop-blur">
          <button className={btn.icon} onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
          <button className={btn.icon} onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </button>
          <button className={btn.icon} onClick={fitWidth} aria-label="Fit width" title="Fit width">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={box} className="thin-scroll overflow-x-auto rounded-2xl bg-slate-300/60 p-3">
        <div style={{ height: h * zoom, width: 794 * zoom, margin: "0 auto" }}>
          <div ref={inner} style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: 794 }}>
            <PaperSheet paper={paper} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Download PDF / Word and Print buttons. ensureSaved must return the persisted paper id. */
export function ExportActions({
  paper,
  ensureSaved,
  onMessage,
  compact,
}: {
  paper: PaperData;
  ensureSaved: () => Promise<number | null>;
  onMessage?: (msg: string, kind?: "ok" | "err") => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<"" | "pdf" | "docx">("");
  const [fallback, setFallback] = useState<{ url: string; name: string; kind: "pdf" | "docx" } | null>(null);
  const portalId = "print-root";

  const pdf = async () => {
    setBusy("pdf");
    setFallback(null);
    try {
      const id = await ensureSaved().catch(() => null);
      const root = document.getElementById(portalId);
      if (!root) throw new Error("Preview not ready — open the paper preview and try again.");
      const result = await exportPagesToPdf(root, paperFileName(paper, "pdf"));
      setFallback({ url: result.url, name: result.fileName, kind: "pdf" });
      if (id) api.downloads.logPdf(id);
      onMessage?.(`PDF ready — ${result.fileName} (${Math.max(1, Math.round(result.size / 1024))} KB) saved to Downloads`);
    } catch (e) {
      onMessage?.(`${e instanceof Error ? e.message : "PDF export failed"} — you can also use Print Paper → “Save as PDF”.`, "err");
    } finally {
      setBusy("");
    }
  };

  const docx = async () => {
    setBusy("docx");
    setFallback(null);
    try {
      const id = await ensureSaved();
      if (!id) throw new Error("Save the paper first, then download the Word file.");
      const res = await fetch(api.downloads.docxUrl(id), { cache: "no-store" });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error((detail as { error?: string } | null)?.error ?? `Word export failed (${res.status})`);
      }
      const blob = await res.blob();
      const fileName = paperFileName(paper, "docx");
      const result = await downloadBlob(blob, fileName);
      setFallback({ url: result.url, name: result.fileName, kind: "docx" });
      onMessage?.(`Word file ready — ${fileName} (${Math.max(1, Math.round(result.size / 1024))} KB) saved to Downloads`);
    } catch (e) {
      onMessage?.(e instanceof Error ? e.message : "Word export failed", "err");
    } finally {
      setBusy("");
    }
  };

  const print = () => {
    printPaper();
    ensureSaved()
      .then((id) => (id ? api.downloads.logPdf(id, "print") : null))
      .catch(() => null);
  };

  return (
    <>
      <PrintPortal paper={paper} rootId={portalId} />
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>
        <button className={btn.primary} onClick={pdf} disabled={!!busy}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Download PDF
        </button>
        <button className={`${btn.secondary} !border-sky-300 !text-sky-800`} onClick={docx} disabled={!!busy}>
          {busy === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType2 className="h-4 w-4" />} Download Word
        </button>
        <button className={btn.secondary} onClick={print} disabled={!!busy}>
          <Printer className="h-4 w-4" /> Print Paper
        </button>
        {fallback && (
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <a
              href={fallback.url}
              download={fallback.name}
              className="font-semibold text-emerald-700 underline decoration-dotted hover:text-emerald-900"
              title="If the download did not start automatically, save the file here"
            >
              Download didn&apos;t start? Save {fallback.name}
            </a>
            {fallback.kind === "pdf" && (
              <a href={fallback.url} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline decoration-dotted hover:text-sky-900">
                Open PDF in a new tab
              </a>
            )}
          </span>
        )}
      </div>
    </>
  );
}
