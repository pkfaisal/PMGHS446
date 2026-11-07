import { db } from "@/db";
import { settings, templates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS, totalMarks } from "@/lib/paper";
import type { PaperData, SchoolSettings, TemplateConfig } from "@/types/paper";

export async function getSettings(): Promise<SchoolSettings> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1));
  if (!rows.length) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(rows[0].data as Partial<SchoolSettings>) };
}

export async function saveSettings(data: Partial<SchoolSettings>): Promise<SchoolSettings> {
  const merged = { ...(await getSettings()), ...data };
  await db
    .insert(settings)
    .values({ id: 1, data: merged })
    .onConflictDoUpdate({ target: settings.id, set: { data: merged, updatedAt: new Date() } });
  return merged;
}

const sec = (
  mcq: [boolean, number],
  short: [boolean, number, number],
  long: [boolean, number],
  ur = false,
): PaperData["sections"] => ({
  mcq: {
    enabled: mcq[0],
    marksEach: mcq[1],
    attempt: 0,
    instructions: ur ? DEFAULT_SETTINGS.mcqInstructionsUrdu : DEFAULT_SETTINGS.mcqInstructions,
  },
  blanks: {
    enabled: false,
    marksEach: 1,
    attempt: 0,
    instructions: ur ? (DEFAULT_SETTINGS.blanksInstructionsUrdu || "خالی جگہیں پُر کریں۔") : (DEFAULT_SETTINGS.blanksInstructions || "Fill in the blanks."),
  },
  translation: {
    enabled: false,
    marksEach: 2,
    attempt: 0,
    targetLang: ur ? "en" : "ur",
    instructions: ur ? (DEFAULT_SETTINGS.translationInstructionsUrdu || "مندرجہ ذیل کا انگریزی میں ترجمہ کریں۔") : (DEFAULT_SETTINGS.translationInstructions || "Translate the following sentences into Urdu."),
  },
  passage: {
    enabled: false,
    marksEach: 2,
    attempt: 0,
    instructions: ur ? (DEFAULT_SETTINGS.passageInstructionsUrdu || "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔") : (DEFAULT_SETTINGS.passageInstructions || "Read the following paragraph carefully and answer the questions below."),
  },
  math: {
    enabled: false,
    marksEach: 4,
    attempt: 0,
    instructions: ur ? (DEFAULT_SETTINGS.mathInstructionsUrdu || "درج ذیل حسابی سوالات اور مساوات حل کریں۔") : (DEFAULT_SETTINGS.mathInstructions || "Solve the following mathematical questions / equations."),
  },
  short: {
    enabled: short[0],
    marksEach: short[1],
    attempt: short[2],
    splitParts: false,
    answerLines: 0,
    instructions: ur ? DEFAULT_SETTINGS.shortInstructionsUrdu : DEFAULT_SETTINGS.shortInstructions,
  },
  shortPartitions: {
    enabled: false,
    marksEach: 2,
    instructions: ur ? "درج ذیل سوالات کے مختصر جوابات تحریر کریں۔" : "Write short answers to the following questions.",
    attempt: 5,
  },
  long: {
    enabled: long[0],
    marksEach: long[1],
    attempt: 0,
    instructions: ur ? DEFAULT_SETTINGS.longInstructionsUrdu : DEFAULT_SETTINGS.longInstructions,
  },
});

const BUILT_IN: { name: string; description: string; config: TemplateConfig }[] = [
  {
    name: "Monthly Test — Paper Saver",
    description: "2 copies on one A4 sheet. MCQs + short + one long question. Ideal for monthly assessments.",
    config: { examTitle: "Monthly Test", copyMode: "2in1", language: "en", timeAllowed: "40 Minutes", showStudentName: true, showRollNo: true, showSection: false, sections: sec([true, 1], [true, 2, 0], [true, 5]) },
  },
  {
    name: "Weekly Test Slip",
    description: "3 slip copies per A4 sheet with cutting lines. Quick MCQs and short questions only.",
    config: { examTitle: "Weekly Test", copyMode: "3in1", language: "en", timeAllowed: "20 Minutes", showStudentName: true, showRollNo: true, showSection: false, sections: sec([true, 1], [true, 2, 0], [false, 5]) },
  },
  {
    name: "Mid Term — Full Page",
    description: "Full A4 single copy with all three sections and section split in short questions.",
    config: { examTitle: "Mid Term", copyMode: "1", language: "en", timeAllowed: "2 Hours", showStudentName: true, showRollNo: true, showSection: true, sections: { ...sec([true, 1], [true, 2, 0], [true, 5]), short: { ...sec([true, 1], [true, 2, 0], [true, 5]).short, splitParts: true } } },
  },
  {
    name: "Final Exam — Board Style",
    description: "Punjab board pattern: objective, short (attempt any) and long questions with choice.",
    config: { examTitle: "Final Exam", copyMode: "1", language: "en", timeAllowed: "2 Hours 40 Minutes", showStudentName: true, showRollNo: true, showSection: true, sections: { ...sec([true, 1], [true, 2, 8], [true, 8]), long: { ...sec([true, 1], [true, 2, 8], [true, 8]).long, attempt: 2 } } },
  },
  {
    name: "اردو ماہانہ ٹیسٹ (Urdu Monthly)",
    description: "Urdu Nastaleeq RTL paper, 2 copies on one page.",
    config: { examTitle: "Monthly Test", copyMode: "2in1", language: "ur", timeAllowed: "40 منٹ", showStudentName: true, showRollNo: true, showSection: false, sections: sec([true, 1], [true, 2, 0], [true, 5], true) },
  },
  {
    name: "Surprise Quiz — MCQs Only",
    description: "Objective-only quiz, 3 copies per sheet.",
    config: { examTitle: "Surprise Quiz", copyMode: "3in1", language: "en", timeAllowed: "10 Minutes", showStudentName: true, showRollNo: true, showSection: false, sections: sec([true, 1], [false, 2, 0], [false, 5]) },
  },
];

export async function ensureTemplates() {
  const existing = await db.select({ id: templates.id }).from(templates).where(eq(templates.builtIn, true)).limit(1);
  if (existing.length) return;
  await db.insert(templates).values(BUILT_IN.map((t) => ({ ...t, builtIn: true })));
}

export function paperColumns(data: PaperData) {
  return {
    examTitle: data.examTitle || "Untitled",
    subject: data.subject || "",
    className: data.className || "",
    language: data.language,
    copyMode: data.copyMode,
    totalMarks: totalMarks(data),
    data,
  };
}
