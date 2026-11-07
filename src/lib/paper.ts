import type {
  CopyMode,
  LongQuestion,
  MCQ,
  PaperData,
  SchoolSettings,
  ShortQuestion,
  TemplateConfig,
} from "@/types/paper";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: "Govt. High School Chak No. 446 Jhang",
  schoolNameUrdu: "گورنمنٹ ہائی سکول چک نمبر ۴۴۶ جھنگ",
  address: "Chak No. 446, District Jhang, Punjab",
  defaultLanguage: "en",
  defaultCopyMode: "1",
  defaultMarginMm: 8,
  defaultTimeAllowed: "40 Minutes",
  examTitles: ["Monthly Test", "Weekly Test", "Mid Term", "Final Exam", "Surprise Quiz"],
  mcqInstructions: "Choose the correct option. Each MCQ carries equal marks.",
  shortInstructions: "Write short answers of the following questions.",
  longInstructions: "Answer the following questions in detail.",
  blanksInstructions: "Fill in the blanks.",
  translationInstructions: "Translate the following sentences into Urdu.",
  passageInstructions: "Read the following paragraph carefully and answer the questions below.",
  mathInstructions: "Solve the following mathematical questions / equations.",
  mcqInstructionsUrdu: "درست جواب کا انتخاب کریں۔ ہر سوال کے نمبر برابر ہیں۔",
  shortInstructionsUrdu: "درج ذیل سوالات کے مختصر جوابات تحریر کریں۔",
  longInstructionsUrdu: "درج ذیل سوالات کے تفصیلی جوابات تحریر کریں۔",
  blanksInstructionsUrdu: "خالی جگہیں پُر کریں۔",
  translationInstructionsUrdu: "مندرجہ ذیل کا انگریزی میں ترجمہ کریں۔",
  passageInstructionsUrdu: "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔",
  mathInstructionsUrdu: "درج ذیل حسابی سوالات اور مساوات حل کریں۔",
};

export const COPY_MODES: { value: CopyMode; label: string; desc: string }[] = [
  { value: "1", label: "1 Copy (1 Page)", desc: "Standard full A4 page" },
  { value: "2in1", label: "2 Copies in 1 Page", desc: "Paper saver · 50% less paper" },
  { value: "3in1", label: "3 Copies in 1 Page", desc: "Slip copies · 66% less paper" },
  { value: "2pages", label: "2 Full Copies (2 Pages)", desc: "Duplicate on separate pages" },
];

export function createDefaultPaper(s: SchoolSettings = DEFAULT_SETTINGS): PaperData {
  const now = new Date();
  const ur = s.defaultLanguage === "ur";
  return {
    schoolName: ur ? s.schoolNameUrdu : s.schoolName,
    examTitle: s.examTitles[0] ?? "Monthly Test",
    className: "10th",
    subject: "Physics",
    month: now.toLocaleString("en-US", { month: "long" }),
    year: String(now.getFullYear()),
    timeAllowed: s.defaultTimeAllowed,
    totalMarks: 0,
    language: s.defaultLanguage,
    showStudentName: true,
    showRollNo: true,
    showSection: false,
    copyMode: s.defaultCopyMode,
    marginMm: s.defaultMarginMm,
    sections: {
      mcq: { enabled: true, marksEach: 1, instructions: ur ? s.mcqInstructionsUrdu : s.mcqInstructions, attempt: 0 },
      blanks: {
        enabled: false,
        marksEach: 1,
        instructions: ur ? (s.blanksInstructionsUrdu || "خالی جگہیں پُر کریں۔") : (s.blanksInstructions || "Fill in the blanks."),
        attempt: 0,
      },
      translation: {
        enabled: false,
        marksEach: 2,
        instructions: ur ? (s.translationInstructionsUrdu || "مندرجہ ذیل کا انگریزی میں ترجمہ کریں۔") : (s.translationInstructions || "Translate the following sentences into Urdu."),
        attempt: 0,
        targetLang: ur ? "en" : "ur",
      },
      passage: {
        enabled: false,
        marksEach: 2,
        instructions: ur ? (s.passageInstructionsUrdu || "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔") : (s.passageInstructions || "Read the following paragraph carefully and answer the questions below."),
        attempt: 0,
      },
      math: {
        enabled: false,
        marksEach: 4,
        instructions: ur ? (s.mathInstructionsUrdu || "درج ذیل حسابی سوالات اور مساوات حل کریں۔") : (s.mathInstructions || "Solve the following mathematical questions / equations."),
        attempt: 0,
      },
      short: {
        enabled: true,
        marksEach: 2,
        instructions: ur ? s.shortInstructionsUrdu : s.shortInstructions,
        attempt: 0,
        splitParts: false,
        answerLines: 0,
        usePartitions: false,
      },
      shortPartitions: {
        enabled: false,
        marksEach: 2,
        instructions: ur ? "درج ذیل سوالات کے مختصر جوابات تحریر کریں۔" : "Write short answers to the following questions.",
        attempt: 5,
      },
      long: { enabled: true, marksEach: 5, instructions: ur ? s.longInstructionsUrdu : s.longInstructions, attempt: 0 },
    },
    mcqs: [],
    blanks: [],
    translations: [],
    passages: [],
    maths: [],
    shorts: [],
    shortPartitions: [],
    longs: [],
  };
}

export function applyTemplate(base: PaperData, t: TemplateConfig): PaperData {
  return {
    ...base,
    examTitle: t.examTitle || base.examTitle,
    copyMode: t.copyMode,
    language: t.language,
    timeAllowed: t.timeAllowed || base.timeAllowed,
    showStudentName: t.showStudentName,
    showRollNo: t.showRollNo,
    showSection: t.showSection,
    sections: JSON.parse(JSON.stringify(t.sections)),
  };
}

export function longMarks(q: LongQuestion): number {
  const sub = q.subParts.reduce((a, s) => a + (Number(s.marks) || 0), 0);
  return sub > 0 ? sub : Number(q.marks) || 0;
}

export function sectionMarks(p: PaperData) {
  // MCQs
  const mcqs = p.mcqs || [];
  const mcqCount = p.sections.mcq.attempt > 0 ? Math.min(p.sections.mcq.attempt, mcqs.length) : mcqs.length;
  const mcq = p.sections.mcq.enabled ? mcqCount * p.sections.mcq.marksEach : 0;

  // Fill in the Blanks
  const blanks = p.blanks || [];
  const blanksSec = p.sections.blanks;
  const blanksCount = blanksSec?.attempt && blanksSec.attempt > 0 ? Math.min(blanksSec.attempt, blanks.length) : blanks.length;
  const blankMarks = blanksSec?.enabled ? blanksCount * (blanksSec.marksEach || 1) : 0;

  // Translation
  const translations = p.translations || [];
  const transSec = p.sections.translation;
  const transCount = transSec?.attempt && transSec.attempt > 0 ? Math.min(transSec.attempt, translations.length) : translations.length;
  let translationMarks = 0;
  if (transSec?.enabled) {
    translationMarks = translations.slice(0, transCount).reduce((acc, t) => acc + (t.marks ?? transSec.marksEach ?? 2), 0);
  }

  // Passage Comprehension
  const passages = p.passages || [];
  const passageSec = p.sections.passage;
  let passageMarks = 0;
  if (passageSec?.enabled) {
    for (const pass of passages) {
      for (const sq of pass.subQuestions || []) {
        passageMarks += Number(sq.marks) || passageSec.marksEach || 2;
      }
    }
  }

  // Mathematics / Equations
  const maths = p.maths || [];
  const mathSec = p.sections.math;
  let mathMarks = 0;
  if (mathSec?.enabled) {
    const mCount = mathSec.attempt && mathSec.attempt > 0 ? Math.min(mathSec.attempt, maths.length) : maths.length;
    mathMarks = maths.slice(0, mCount).reduce((acc, m) => {
      const sub = (m.subParts || []).reduce((a, s) => a + (Number(s.marks) || 0), 0);
      return acc + (sub > 0 ? sub : Number(m.marks) || mathSec.marksEach || 4);
    }, 0);
  }

  // Short Questions (Partitions or Standard)
  let short = 0;
  if (p.sections.shortPartitions?.enabled && (p.shortPartitions || []).length > 0) {
    for (const part of p.shortPartitions || []) {
      const pQuestions = part.questions || [];
      const count = part.attempt > 0 ? Math.min(part.attempt, pQuestions.length) : pQuestions.length;
      short += count * (part.marksEach || 2);
    }
  } else if (p.sections.short.enabled) {
    const shorts = p.shorts || [];
    const shortCount = p.sections.short.attempt > 0 ? Math.min(p.sections.short.attempt, shorts.length) : shorts.length;
    short = shortCount * p.sections.short.marksEach;
  }

  // Long Questions
  let long = 0;
  const longs = p.longs || [];
  if (p.sections.long.enabled && longs.length) {
    const marks = longs.map(longMarks).sort((a, b) => b - a);
    const n = p.sections.long.attempt > 0 ? Math.min(p.sections.long.attempt, marks.length) : marks.length;
    long = marks.slice(0, n).reduce((a, b) => a + b, 0);
  }

  const total = mcq + blankMarks + translationMarks + passageMarks + mathMarks + short + long;
  return { mcq, blanks: blankMarks, translation: translationMarks, passage: passageMarks, math: mathMarks, short, long, total };
}

export function totalMarks(p: PaperData): number {
  return p.totalMarks > 0 ? p.totalMarks : sectionMarks(p).total;
}

import { correctQuestionText } from "@/lib/questionCorrection";

export type Density = "spacious" | "normal" | "compact" | "dense" | "ultra";

/** Dynamic Content Density & Layout Balance Engine */
export function calculatePaperDensity(p: PaperData, availableHeightPx: number): Density {
  const mcqs = p.sections.mcq.enabled ? (p.mcqs || []) : [];
  const blanks = p.sections.blanks?.enabled ? (p.blanks || []) : [];
  const translations = p.sections.translation?.enabled ? (p.translations || []) : [];
  const passages = p.sections.passage?.enabled ? (p.passages || []) : [];
  const passageSubCount = passages.reduce((acc, pass) => acc + (pass.subQuestions || []).length, 0);
  const maths = p.sections.math?.enabled ? (p.maths || []) : [];
  const mathSubCount = maths.reduce((acc, m) => acc + (m.subParts || []).length, 0);
  const shorts = (p.sections.shortPartitions?.enabled && (p.shortPartitions || []).length > 0)
    ? (p.shortPartitions || []).flatMap((part) => part.questions || [])
    : p.sections.short.enabled ? (p.shorts || []) : [];
  const longs = p.sections.long.enabled ? (p.longs || []) : [];
  const subParts = longs.reduce((a, l) => a + (l.subParts || []).length, 0) + mathSubCount + passageSubCount;
  
  const chars =
    mcqs.reduce((a, m) => a + m.text.length + m.options.join("").length, 0) +
    blanks.reduce((a, b) => a + b.text.length, 0) +
    translations.reduce((a, t) => a + t.text.length, 0) +
    passages.reduce((a, p) => a + p.passageText.length + p.subQuestions.reduce((sb, sq) => sb + sq.text.length, 0), 0) +
    maths.reduce((a, m) => a + m.text.length + (m.equation || "").length, 0) +
    shorts.reduce((a, s) => a + s.text.length, 0) +
    longs.reduce((a, l) => a + l.text.length + (l.subParts || []).reduce((b, s) => b + s.text.length, 0), 0);

  const lines = (p.sections.short.answerLines || 0) * shorts.length;
  const totalQ = mcqs.length + blanks.length + translations.length + passages.length + maths.length + shorts.length + longs.length;
  const raw = totalQ * 1.5 + subParts * 1 + chars / 120 + lines * 0.6 + 6;
  const urduFactor = p.language === "ur" ? 1.3 : 1;
  const score = (raw * urduFactor) / (availableHeightPx / 1100);
  if (score < 18) return "spacious";
  if (score < 36) return "normal";
  if (score < 56) return "compact";
  if (score < 80) return "dense";
  return "ultra";
}

export function paperFileName(p: PaperData, ext: string): string {
  const clean = (v: string) =>
    (v || "")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  const base = [clean(p.examTitle) || "Test_Paper", clean(p.className) ? `Class_${clean(p.className)}` : "", clean(p.subject)]
    .filter(Boolean)
    .join("_");
  return `${base}.${ext}`;
}

/* ---------------- Bulk paste parser ---------------- */

export interface ParsedQuestions {
  mcqs: MCQ[];
  shorts: ShortQuestion[];
  longs: LongQuestion[];
}

const URDU_DIGIT_MAP: Record<string, string> = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const normDigits = (s: string) => s.replace(/[۰-۹٠-٩]/g, (d) => URDU_DIGIT_MAP[d] ?? d);

const Q_START = /^\s*(?:Q(?:uestion)?\s*(?:No\.?)?\s*[.:#]?\s*)?(?:\d{1,3}|[ivxlc]{1,6})\s*[.):\-–]\s+/i;
const Q_START_UR = /^\s*(?:سوال\s*(?:نمبر)?\s*)?[0-9۰-۹]{1,3}\s*[.):\-–۔]\s*/;
const OPT_LINE = /^\s*[([]?\s*([a-fA-F]|الف|ب|ج|د)\s*[)\].:\-–۔]\s*/;
const INLINE_OPTS = /[([]\s*([a-dA-D]|الف|ب|ج|د)\s*[)\]]\s*/g;
const SUBPART_LINE = /^\s*[([]?\s*([a-hA-H]|i{1,3}|iv|v|vi|الف|ب|ج|د)\s*[)\]]\s*/;
const MARKS_TAIL = /\s*[([]\s*(\d{1,2})\s*(?:marks?|m|نمبر)?\s*[)\]]\s*$/i;

function stripQPrefix(line: string): string {
  return line.replace(Q_START, "").replace(Q_START_UR, "").trim();
}

function extractMarks(text: string): { text: string; marks: number | null } {
  const n = normDigits(text);
  const m = n.match(MARKS_TAIL);
  if (m) return { text: text.slice(0, text.length - m[0].length).trim(), marks: Number(m[1]) };
  return { text: text.trim(), marks: null };
}

function splitInlineOptions(line: string): { stem: string; options: string[] } | null {
  const parts = line.split(INLINE_OPTS);
  // parts: [stem, label, text, label, text, ...]
  if (parts.length >= 7) {
    const options: string[] = [];
    for (let i = 2; i < parts.length; i += 2) options.push(parts[i].trim());
    return { stem: parts[0].trim(), options };
  }
  return null;
}

export function parseBulkText(raw: string, mode: "auto" | "mcq" | "short" | "long", defaultLongMarks = 5): ParsedQuestions {
  const result: ParsedQuestions = { mcqs: [], shorts: [], longs: [] };
  const lines = raw.replace(/\r/g, "").split("\n");
  const hasNumbering = lines.some((l) => Q_START.test(l) || Q_START_UR.test(l));

  // Group into blocks
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (!hasNumbering && cur.length) {
        blocks.push(cur);
        cur = [];
      }
      continue;
    }
    const isStart = hasNumbering && (Q_START.test(t) || Q_START_UR.test(t)) && !OPT_LINE.test(t);
    if (isStart && cur.length) {
      blocks.push(cur);
      cur = [];
    }
    cur.push(t);
  }
  if (cur.length) blocks.push(cur);

  // When no numbering and no blank lines in short mode: each line is a question
  let finalBlocks = blocks;
  if (!hasNumbering && blocks.length === 1 && (mode === "short" || (mode === "auto" && !blocks[0].some((l) => OPT_LINE.test(l))))) {
    finalBlocks = blocks[0].map((l) => [l]);
  }

  for (const block of finalBlocks) {
    const first = stripQPrefix(block[0]);
    const rest = block.slice(1);
    const optLines = rest.filter((l) => OPT_LINE.test(l));
    const restNonOpt = rest.filter((l) => !OPT_LINE.test(l));
    let stem = [first, ...restNonOpt].join(" ");
    let options: string[] = [];

    const expanded = optLines.flatMap((l) => {
      const multi = splitInlineOptions("x " + l);
      if (multi && multi.options.length > 1) return multi.options;
      return [l.replace(OPT_LINE, "").trim()];
    });
    if (expanded.length >= 2) {
      options = expanded;
    } else {
      const inline = splitInlineOptions([first, ...rest].join(" "));
      if (inline && inline.options.length >= 2) {
        stem = inline.stem;
        options = inline.options;
      }
    }

    const stemMarks = extractMarks(stem).marks;
    const optsHaveMarks = optLines.some((l) => MARKS_TAIL.test(normDigits(l)));
    const looksLong = optsHaveMarks || (stemMarks !== null && stemMarks >= 3);

    const kind: "mcq" | "short" | "long" =
      mode !== "auto"
        ? mode
        : options.length >= 2 && !looksLong
          ? "mcq"
          : looksLong || rest.some((l) => SUBPART_LINE.test(l)) || block.join(" ").length > 160
            ? "long"
            : "short";

    if (kind === "mcq") {
      const opts = options.length ? options : ["", "", "", ""];
      while (opts.length < 4) opts.push("");
      const cleanStem = correctQuestionText(extractMarks(stem).text);
      const cleanOpts = opts.slice(0, 6).map((o) => correctQuestionText(o));
      result.mcqs.push({ id: uid(), text: cleanStem, options: cleanOpts });
    } else if (kind === "short") {
      const rawText = extractMarks([first, ...rest].join(" ")).text;
      const cleanText = correctQuestionText(rawText);
      if (cleanText) result.shorts.push({ id: uid(), text: cleanText, part: "A" });
    } else {
      const subLines = rest.filter((l) => SUBPART_LINE.test(l));
      const stemLines = [first, ...rest.filter((l) => !SUBPART_LINE.test(l))];
      const { text, marks } = extractMarks(stemLines.join(" "));
      const cleanStem = correctQuestionText(text);
      const subParts = subLines.map((l) => {
        const e = extractMarks(l.replace(SUBPART_LINE, ""));
        return { id: uid(), text: correctQuestionText(e.text), marks: e.marks ?? 0 };
      });
      if (subParts.length && subParts.every((s) => !s.marks)) {
        const total = marks ?? defaultLongMarks;
        const each = Math.max(1, Math.round(total / subParts.length));
        subParts.forEach((s) => (s.marks = each));
      }
      result.longs.push({ id: uid(), text: cleanStem, marks: marks ?? defaultLongMarks, subParts });
    }
  }
  return result;
}

export function samplePaper(base: PaperData): PaperData {
  return {
    ...base,
    mcqs: [
      { id: uid(), text: "The SI unit of force is:", options: ["Joule", "Newton", "Watt", "Pascal"] },
      { id: uid(), text: "Speed of light in vacuum is:", options: ["3×10⁸ m/s", "3×10⁶ m/s", "3×10⁵ m/s", "3×10⁴ m/s"] },
      { id: uid(), text: "Which is a vector quantity?", options: ["Mass", "Time", "Velocity", "Energy"] },
      { id: uid(), text: "One horsepower equals:", options: ["746 W", "500 W", "1000 W", "640 W"] },
    ],
    shorts: [
      { id: uid(), text: "Define inertia with an example.", part: "A" },
      { id: uid(), text: "Differentiate between mass and weight.", part: "A" },
      { id: uid(), text: "State Newton's second law of motion.", part: "B" },
      { id: uid(), text: "What is meant by friction?", part: "B" },
    ],
    longs: [
      {
        id: uid(),
        text: "Newton's Laws of Motion",
        marks: 5,
        subParts: [
          { id: uid(), text: "State and explain Newton's third law with examples.", marks: 3 },
          { id: uid(), text: "A force of 20 N acts on a 4 kg mass. Find its acceleration.", marks: 2 },
        ],
      },
    ],
  };
}
