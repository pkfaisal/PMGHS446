import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { PaperData, ShortQuestion } from "@/types/paper";
import { OPTION_LABELS, label, num } from "@/lib/urdu";
import { longMarks, sectionMarks, totalMarks } from "@/lib/paper";
import { balancedChunks, examLine, headerMeta, questionColumns } from "@/lib/layout";

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const CELL_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

/**
 * Builds the .docx from the exact same layout rules as the on-screen paper:
 * borderless header, English numerals, 2-column short questions (10+),
 * 2-column long questions (more than 5), dynamic question-count font adjustment,
 * and one-line horizontal metadata with equal spacing.
 */
export async function generatePaperDocx(p: PaperData): Promise<Buffer> {
  const ur = p.language === "ur";
  const lang = p.language;
  const font = ur ? "Jameel Noori Nastaleeq" : "Calibri";

  // Dynamic scale adjustment based on question count
  const totalQuestions =
    (p.sections.mcq.enabled ? p.mcqs.length : 0) +
    (p.sections.short.enabled ? p.shorts.length : 0) +
    (p.sections.long.enabled ? p.longs.length : 0);

  let fontMultiplier = 1.0;
  let spacingMultiplier = 1.0;
  if (p.copyMode === "1") {
    if (totalQuestions <= 4) {
      fontMultiplier = 1.25;
      spacingMultiplier = 1.6;
    } else if (totalQuestions <= 8) {
      fontMultiplier = 1.1;
      spacingMultiplier = 1.25;
    } else if (totalQuestions >= 18) {
      fontMultiplier = 0.88;
      spacingMultiplier = 0.8;
    }
  } else if (p.copyMode === "2in1") {
    if (totalQuestions <= 3) {
      fontMultiplier = 1.15;
      spacingMultiplier = 1.3;
    } else if (totalQuestions >= 10) {
      fontMultiplier = 0.88;
      spacingMultiplier = 0.8;
    }
  } else {
    // 3in1
    if (totalQuestions <= 2) {
      fontMultiplier = 1.15;
      spacingMultiplier = 1.2;
    } else if (totalQuestions >= 8) {
      fontMultiplier = 0.88;
      spacingMultiplier = 0.75;
    }
  }

  const baseScale = p.copyMode === "3in1" ? 0.72 : p.copyMode === "2in1" ? 0.84 : 1;
  const scale = baseScale * fontMultiplier;
  const sz = (pt: number) => Math.max(14, Math.round(pt * 2 * scale * (ur ? 1.12 : 1)));

  const run = (text: string, opts: { bold?: boolean; size?: number; italics?: boolean } = {}) =>
    new TextRun({
      text,
      bold: opts.bold,
      italics: opts.italics,
      size: sz(opts.size ?? 11),
      font,
      rightToLeft: ur,
    });

  const para = (
    children: TextRun[],
    opts: { alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number; indent?: number; spacing?: number } = {},
  ) =>
    new Paragraph({
      children,
      alignment: opts.alignment ?? (ur ? AlignmentType.RIGHT : AlignmentType.LEFT),
      bidirectional: ur,
      spacing: {
        after: Math.round((opts.after ?? 30) * spacingMultiplier),
        before: Math.round((opts.before ?? 0) * spacingMultiplier),
        line: opts.spacing ?? (ur ? 340 : 250),
      },
      indent: opts.indent ? (ur ? { right: opts.indent } : { left: opts.indent }) : undefined,
    });

  const cell = (children: (Paragraph | Table)[], widthPct: number, span?: number) =>
    new TableCell({
      children,
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      columnSpan: span,
      borders: CELL_BORDERS,
      margins: { top: 0, bottom: 0, left: 80, right: 80 },
    });

  /** Two-column (or one-column) block of question paragraphs, no borders. */
  const columnTable = (chunks: Paragraph[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      visuallyRightToLeft: ur,
      rows: [
        new TableRow({
          cantSplit: true,
          children: chunks.map((paras) => cell(paras, Math.floor(100 / chunks.length))),
        }),
      ],
    });

  const marks = sectionMarks(p);
  const total = totalMarks(p);
  const meta = headerMeta(p);

  function sectionHead(title: string, m: number, instr: string): Paragraph[] {
    const out = [
      para([run(`${title}  (${label("marks", lang)}: ${num(m, lang)})`, { bold: true, size: 12 })], {
        alignment: AlignmentType.CENTER,
        before: 90,
        after: 20,
      }),
    ];
    if (instr.trim()) {
      out.push(para([run(instr, { italics: true, size: 9.5 })], { alignment: AlignmentType.CENTER, after: 40 }));
    }
    return out;
  }

  function buildCopy(): (Paragraph | Table)[] {
    const out: (Paragraph | Table)[] = [];

    // ---- Header (no borders / no table) : school, exam line, Subject, Class, Time, Total Marks
    out.push(para([run(p.schoolName, { bold: true, size: p.copyMode === "1" ? 17 : 15 })], { alignment: AlignmentType.CENTER, after: 10 }));
    out.push(para([run(examLine(p), { bold: true, size: 11.5 })], { alignment: AlignmentType.CENTER, after: 20 }));
    // All four items on ONE single horizontal line with equal spacing across the page
    const metaCells = meta.map((m) =>
      cell(
        [
          para(
            [run(`${m.label}: `, { bold: true, size: 9.5 }), run(m.value, { size: 9.5 })],
            { alignment: AlignmentType.CENTER, after: 0, before: 0 }
          ),
        ],
        25
      )
    );
    out.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        visuallyRightToLeft: ur,
        rows: [new TableRow({ cantSplit: true, children: metaCells })],
      })
    );

    const student: string[] = [];
    if (p.showStudentName) student.push(`${label("name", lang)}: ____________________`);
    if (p.showRollNo) student.push(`${label("rollNo", lang)}: __________`);
    if (p.showSection) student.push(`${label("section", lang)}: ______`);
    if (student.length) out.push(para([run(student.join("        "), { size: 10 })], { before: 60, after: 60 }));

    let qCount = 1;

    // Helper for blank text in Word
    const formatBlankRuns = (text: string) => {
      const parts = text.split(/(?:_{3,}|\[blank\])/i);
      const runs: TextRun[] = [];
      if (parts.length === 1) {
        runs.push(run(text));
        runs.push(new TextRun({ text: "  ____________  ", underline: {}, font }));
        return runs;
      }
      parts.forEach((part, idx) => {
        if (part) runs.push(run(part));
        if (idx < parts.length - 1) {
          runs.push(new TextRun({ text: "  ____________  ", underline: {}, font }));
        }
      });
      return runs;
    };

    // ---- 1. Section: MCQs
    const showMcq = p.sections.mcq.enabled && (p.mcqs || []).length > 0;
    if (showMcq) {
      const qNum = qCount++;
      out.push(...sectionHead(`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.mcq.instructions || label("sectionI", lang)}`, marks.mcq, ""));
      const rows: TableRow[] = [];
      p.mcqs.forEach((m, i) => {
        rows.push(
          new TableRow({
            cantSplit: true,
            children: [
              cell([para([run(`${num(i + 1, lang)}.`, { bold: true })], { after: 0 })], 6),
              cell([para([run(m.text)], { after: 0 })], 94, 4),
            ],
          }),
        );
        const opts = m.options.filter((o) => o.trim() !== "");
        const w = Math.floor(94 / Math.max(1, opts.length));
        rows.push(
          new TableRow({
            cantSplit: true,
            children: [
              cell([para([run("")], { after: 0 })], 6),
              ...opts.slice(0, 4).map((o, j) => cell([para([run(`(${OPTION_LABELS[lang][j]}) ${o}`, { size: 9.5 })], { after: 20 })], w)),
            ],
          }),
        );
      });
      out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, visuallyRightToLeft: ur, rows }));
    }

    // ---- 2. Section: Fill in the Blanks
    const showBlanks = p.sections.blanks?.enabled && (p.blanks || []).length > 0;
    if (showBlanks) {
      const qNum = qCount++;
      const defaultBlanksInstr = ur ? "خالی جگہیں پُر کریں۔" : "Fill in the blanks.";
      out.push(...sectionHead(`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.blanks?.instructions || defaultBlanksInstr}`, marks.blanks, ""));
      (p.blanks || []).forEach((b, i) => {
        const itemRuns = [run(`${num(i + 1, lang)}.  `, { bold: true }), ...formatBlankRuns(b.text)];
        out.push(para(itemRuns, { indent: 100, after: 25 }));
      });
    }

    // ---- 3. Section: Translation
    const showTranslation = p.sections.translation?.enabled && (p.translations || []).length > 0;
    if (showTranslation) {
      const qNum = qCount++;
      const targetIsUrdu = p.sections.translation?.targetLang === "ur";
      const defaultInstr = targetIsUrdu
        ? (ur ? "مندرجہ ذیل جملوں کا اردو میں ترجمہ کریں۔" : "Translate the following sentences into Urdu.")
        : (ur ? "مندرجہ ذیل جملوں کا انگریزی میں ترجمہ کریں۔" : "Translate the following sentences into English.");
      out.push(...sectionHead(`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.translation?.instructions || defaultInstr}`, marks.translation, ""));
      (p.translations || []).forEach((t, i) => {
        const itemRuns = [run(`${num(i + 1, lang)}.  `, { bold: true }), run(t.text)];
        if (t.marks) itemRuns.push(run(`   (${num(t.marks, lang)})`, { bold: true, size: 9.5 }));
        out.push(para(itemRuns, { indent: 100, after: 25 }));
      });
    }

    // ---- 4. Section: Passage / Comprehension
    const showPassage = p.sections.passage?.enabled && (p.passages || []).length > 0;
    if (showPassage) {
      (p.passages || []).forEach((pass) => {
        const qNum = qCount++;
        const defaultPassageInstr = ur
          ? "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔"
          : "Read the following paragraph carefully and answer the questions below.";
        const pMarks = (pass.subQuestions || []).reduce((acc, sq) => acc + (Number(sq.marks) || 0), 0);
        out.push(...sectionHead(`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.passage?.instructions || defaultPassageInstr}`, pMarks, ""));
        if (pass.title) {
          out.push(para([run(pass.title, { bold: true, size: 10.5 })], { indent: 100, after: 10 }));
        }
        out.push(para([run(pass.passageText, { italics: true })], { indent: 120, after: 30 }));
        (pass.subQuestions || []).forEach((sq, sqIdx) => {
          out.push(
            para(
              [
                run(`(${num(sqIdx + 1, lang)})  `, { bold: true }),
                run(sq.text),
                run(`   (${num(sq.marks, lang)})`, { bold: true, size: 9.5 }),
              ],
              { indent: 200, after: 20 }
            )
          );
        });
      });
    }

    // ---- 5. Section: Mathematics & Equations
    const showMath = p.sections.math?.enabled && (p.maths || []).length > 0;
    if (showMath) {
      const qNum = qCount++;
      const defaultMathInstr = ur ? "درج ذیل حسابی سوالات اور مساوات حل کریں۔" : "Solve the following mathematical questions / equations.";
      out.push(...sectionHead(`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.math?.instructions || defaultMathInstr}`, marks.math, ""));
      (p.maths || []).forEach((m, i) => {
        out.push(
          para(
            [
              run(`${num(i + 1, lang)}.  `, { bold: true }),
              run(m.text),
              run(`   (${num(m.marks, lang)})`, { bold: true, size: 9.5 }),
            ],
            { indent: 100, after: m.equation ? 10 : 25 }
          )
        );
        if (m.equation) {
          out.push(
            para([run(m.equation, { bold: true, size: 11 })], {
              alignment: AlignmentType.CENTER,
              after: 25,
            })
          );
        }
        (m.subParts || []).forEach((sp, spIdx) => {
          out.push(
            para(
              [
                run(`(${num(spIdx + 1, lang)})  `, { bold: true }),
                run(sp.text),
                run(`   (${num(sp.marks, lang)})`, { bold: true, size: 9.5 }),
              ],
              { indent: 260, after: 15 }
            )
          );
        });
      });
    }

    // ---- 6. Section: Short Question Partitions (Board Style)
    const showPartitions = p.sections.shortPartitions?.enabled && (p.shortPartitions || []).length > 0;
    const showShort = p.sections.short.enabled && (p.shorts || []).length > 0;
    if (showPartitions) {
      (p.shortPartitions || []).forEach((part) => {
        const qNum = qCount++;
        const pQuestions = part.questions || [];
        const attemptCount = part.attempt > 0 ? part.attempt : pQuestions.length;
        const partTitle = ur
          ? `سوال نمبر ${num(qNum, lang)}: مندرجہ ذیل ${num(pQuestions.length, lang)} میں سے کوئی سے ${num(attemptCount, lang)} سوالات کے مختصر جوابات تحریر کریں۔`
          : `Q.${num(qNum, lang)}: Write short answers to any ${attemptCount} of the following ${pQuestions.length} questions.`;
        const partMarks = attemptCount * (part.marksEach || 2);
        out.push(...sectionHead(part.instructions || partTitle, partMarks, ""));
        const cols = questionColumns(pQuestions.length, "short");
        const chunks = balancedChunks(pQuestions, cols);
        let n = 1;
        const columnParas: Paragraph[][] = [];
        chunks.forEach((chunk) => {
          const paras: Paragraph[] = [];
          chunk.forEach((q) => {
            paras.push(para([run(`(${num(n, lang)})  `, { bold: true }), run(q.text)], { indent: 100, after: 30 }));
            n++;
          });
          columnParas.push(paras);
        });
        out.push(columnTable(columnParas));
      });
    } else if (showShort) {
      // Standard Short Questions
      const s = p.sections.short;
      const qNum = qCount++;
      const attemptTxt =
        s.attempt > 0 ? (ur ? ` ${label("attempt", lang)} ${num(s.attempt, lang)} ${label("questions", lang)}۔` : ` Attempt any ${s.attempt} questions.`) : "";
      out.push(...sectionHead(`${label("q", lang)} ${num(qNum, lang)}: ${s.instructions || label("sectionII", lang)}${attemptTxt}`, marks.short, ""));
      let n = 1;
      const groups: { part: "" | "A" | "B"; list: ShortQuestion[] }[] = s.splitParts
        ? [
            { part: "A", list: p.shorts.filter((q) => q.part === "A") },
            { part: "B", list: p.shorts.filter((q) => q.part === "B") },
          ]
        : [{ part: "", list: p.shorts }];

      for (const g of groups) {
        if (!g.list.length) continue;
        if (g.part) out.push(para([run(label(g.part === "A" ? "partA" : "partB", lang), { bold: true, size: 10 })], { before: 20 }));
        const cols = questionColumns(g.list.length, "short");
        const chunks = balancedChunks(g.list, cols);
        const columnParas: Paragraph[][] = [];
        chunks.forEach((chunk) => {
          const paras: Paragraph[] = [];
          chunk.forEach((q) => {
            paras.push(para([run(`(${num(n, lang)})  `, { bold: true }), run(q.text)], { indent: 100, after: 30 }));
            for (let l = 0; l < s.answerLines; l++) paras.push(para([run("_".repeat(34), { size: 9 })], { indent: 100, after: 0 }));
            n++;
          });
          columnParas.push(paras);
        });
        out.push(columnTable(columnParas));
      }
    }

    // ---- 7. Section: Long Questions
    const showLong = p.sections.long.enabled && (p.longs || []).length > 0;
    if (showLong) {
      const s = p.sections.long;
      const longHeading = s.instructions || (s.attempt > 0
        ? (ur ? `حصہ سوم — تفصیلی سوالات (کوئی سے ${num(s.attempt, lang)} سوالات حل کریں)` : `Section III — Long Questions (Attempt any ${s.attempt} questions)`)
        : label("sectionIII", lang));
      out.push(...sectionHead(longHeading, marks.long, ""));

      const cols = questionColumns(p.longs.length, "long");
      const chunks = balancedChunks(p.longs, cols);
      let qNo = 1;
      const columnParas: Paragraph[][] = [];
      chunks.forEach((chunk) => {
        const paras: Paragraph[] = [];
        chunk.forEach((q) => {
          paras.push(
            para(
              [
                run(`${label("q", lang)} ${num(qNo, lang)}: `, { bold: true }),
                run(q.text),
                run(q.subParts.length ? "" : `   (${num(longMarks(q), lang)})`, { bold: true }),
              ],
              { before: 30, after: 20 },
            ),
          );
          q.subParts.forEach((sp, j) => {
            paras.push(para([run(`(${num(j + 1, lang)}) `, { bold: true }), run(sp.text), run(`   (${num(sp.marks, lang)})`, { bold: true })], { indent: 260, after: 10 }));
          });
          if (q.subParts.length) {
            paras.push(para([run(`(${num(longMarks(q), lang)})`, { bold: true })], { alignment: ur ? AlignmentType.LEFT : AlignmentType.RIGHT, after: 30 }));
          }
          qNo++;
        });
        columnParas.push(paras);
      });
      out.push(columnTable(columnParas));
    }

    return out;
  }

  const copies = p.copyMode === "2in1" ? 2 : p.copyMode === "3in1" ? 3 : p.copyMode === "2pages" ? 2 : 1;
  const children: (Paragraph | Table)[] = [];
  for (let c = 0; c < copies; c++) {
    if (c > 0) {
      if (p.copyMode === "2pages") children.push(new Paragraph({ children: [new PageBreak()] }));
      else
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 90, after: 90 },
            children: [new TextRun({ text: "✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -", color: "888888", size: 14 })],
          }),
        );
    }
    children.push(...buildCopy());
  }

  const margin = Math.round((p.marginMm || 8) * 56.7);
  const doc = new Document({
    creator: "Smart School Paper Maker",
    title: `${p.examTitle} ${p.className} ${p.subject}`,
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
