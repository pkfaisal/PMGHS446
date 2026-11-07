import { db } from "@/db";
import { papers, questions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { longMarks } from "@/lib/paper";
import type { PaperData } from "@/types/paper";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RouteContext<"/api/questions/import-from-paper/[paperId]">) {
  const { paperId } = await ctx.params;
  const [row] = await db.select().from(papers).where(eq(papers.id, Number(paperId)));
  if (!row) return Response.json({ error: "Paper not found" }, { status: 404 });
  const p = row.data as PaperData;
  const base = { subject: p.subject, className: p.className, language: p.language, chapter: "" };

  // Avoid duplicates already in bank for this subject/class
  const existing = await db
    .select({ text: questions.text, type: questions.type })
    .from(questions)
    .where(and(eq(questions.subject, p.subject), eq(questions.className, p.className)));
  const seen = new Set(existing.map((e) => `${e.type}::${e.text.trim()}`));

  const partitionQuestions = (p.shortPartitions || []).flatMap((part) =>
    (part.questions || []).map((q) => ({
      ...base,
      type: "short",
      text: q.text,
      options: [],
      subParts: [],
      marks: part.marksEach || 2,
    }))
  );

  const values = [
    ...(p.mcqs || []).map((m) => ({ ...base, type: "mcq", text: m.text, options: m.options, subParts: [], marks: p.sections.mcq.marksEach })),
    ...(p.blanks || []).map((b) => ({ ...base, type: "short", text: b.text, options: [], subParts: [], marks: p.sections.blanks?.marksEach || 1 })),
    ...(p.translations || []).map((t) => ({ ...base, type: "short", text: t.text, options: [], subParts: [], marks: t.marks || p.sections.translation?.marksEach || 2 })),
    ...(p.maths || []).map((m) => ({ ...base, type: "long", text: `${m.text} ${m.equation || ""}`.trim(), options: [], subParts: (m.subParts || []).map((s) => ({ text: s.text, marks: s.marks })), marks: m.marks })),
    ...(p.shorts || []).map((s) => ({ ...base, type: "short", text: s.text, options: [], subParts: [], marks: p.sections.short.marksEach })),
    ...partitionQuestions,
    ...(p.longs || []).map((l) => ({
      ...base,
      type: "long",
      text: l.text,
      options: [],
      subParts: (l.subParts || []).map((s) => ({ text: s.text, marks: s.marks })),
      marks: longMarks(l),
    })),
  ].filter((v) => v.text.trim() && !seen.has(`${v.type}::${v.text.trim()}`));

  const totalPossible =
    (p.mcqs?.length || 0) +
    (p.blanks?.length || 0) +
    (p.translations?.length || 0) +
    (p.maths?.length || 0) +
    (p.shorts?.length || 0) +
    partitionQuestions.length +
    (p.longs?.length || 0);

  if (values.length) await db.insert(questions).values(values);
  return Response.json({ inserted: values.length, skipped: totalPossible - values.length });
}
