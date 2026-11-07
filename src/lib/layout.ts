import type { PaperData } from "@/types/paper";
import { CLASSES_UR, EXAM_TITLES_UR, MONTHS_UR, SUBJECTS_UR, label, num, tr } from "@/lib/urdu";
import { totalMarks } from "@/lib/paper";

/*
 * Single source of truth for paper layout rules so the on-screen paper,
 * the PDF (rasterised from the screen) and the .docx stay identical.
 */

/** Short: 10+ questions -> 2 balanced columns. Long: more than 5 -> 2 balanced columns. */
export function questionColumns(count: number, kind: "short" | "long"): 1 | 2 {
  if (count <= 0) return 1;
  if (kind === "short") return count >= 10 ? 2 : 1;
  return count > 5 ? 2 : 1;
}

/** Split items into `cols` balanced chunks (first column may hold one extra). */
export function balancedChunks<T>(items: T[], cols: number): T[][] {
  if (cols <= 1 || items.length <= 1) return [items];
  const per = Math.ceil(items.length / cols);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per));
  return out;
}

/** Header lines in the requested order: Subject, Class, Time, Total Marks (digits in English). */
export function headerMeta(p: PaperData): { label: string; value: string }[] {
  const lang = p.language;
  return [
    { label: label("subject", lang), value: tr(SUBJECTS_UR, p.subject, lang) },
    { label: label("class", lang), value: tr(CLASSES_UR, p.className, lang) },
    { label: label("time", lang), value: num(p.timeAllowed, lang) },
    { label: label("totalMarks", lang), value: num(totalMarks(p), lang) },
  ];
}

/** Test heading preserving the user's entered/selected title in its original language. */
export function examLine(p: PaperData): string {
  const title = (p.examTitle || "").trim() || (p.language === "ur" ? "ٹیسٹ" : "Test");
  const month = p.language === "ur" ? (MONTHS_UR[p.month] || p.month) : p.month;
  const year = num(p.year, p.language);
  const dateStr = [month, year].filter(Boolean).join(" ");
  return dateStr ? `${title} — ${dateStr}` : title;
}

/** Subject, Class, Time and Total Marks always appear on one horizontal line with equal spacing. */
export function stackedHeader(_p: PaperData): boolean {
  return false;
}

/** Meaningful download name, e.g. Monthly_Test_Class_10th_Physics.pdf */
export function paperBaseName(p: PaperData): string {
  const clean = (s: string) =>
    (s || "")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  const exam = clean(p.examTitle) || "Test_Paper";
  const cls = clean(p.className);
  const subject = clean(p.subject);
  return [exam, cls ? `Class_${cls}` : "", subject].filter(Boolean).join("_");
}
