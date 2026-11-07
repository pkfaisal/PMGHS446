"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PaperRecord } from "@/types/paper";
import { COPY_MODES } from "@/lib/paper";
import { Card, Toast, btn } from "@/components/ui";
import { ExportActions, ZoomablePaper } from "@/components/PaperPreviewPane";

export default function PaperPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [rec, setRec] = useState<PaperRecord | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  useEffect(() => {
    api.papers
      .get(Number(id))
      .then(setRec)
      .catch((e) => setError(e instanceof Error ? e.message : "Not found"));
  }, [id]);

  const notify = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const ensureSaved = useCallback(async () => rec?.id ?? null, [rec]);

  if (error)
    return (
      <Card className="py-12 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Link href="/papers" className={btn.secondary}>
          Back to My Papers
        </Link>
      </Card>
    );
  if (!rec)
    return (
      <div className="flex justify-center py-20 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  const p = rec.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/papers" className={btn.icon} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-slate-800">
            {p.examTitle} — {p.subject}
          </h1>
          <p className="text-sm text-slate-500">
            Class {p.className} · {rec.totalMarks} marks · {COPY_MODES.find((c) => c.value === p.copyMode)?.label} · A4 (210 × 297 mm)
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={`/create?id=${rec.id}`} className={btn.secondary}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button
            className={btn.secondary}
            onClick={async () => {
              const c = await api.papers.duplicate(rec.id);
              router.push(`/create?id=${c.id}`);
            }}
          >
            <Copy className="h-4 w-4" /> Duplicate
          </button>
        </div>
      </div>
      <Card className="!p-3">
        <ExportActions paper={p} ensureSaved={ensureSaved} onMessage={notify} />
      </Card>
      <ZoomablePaper paper={p} initialZoom={0.9} fit />
      {toast && <Toast msg={toast.msg} kind={toast.kind} onClose={() => setToast(null)} />}
    </div>
  );
}
