import type { Language } from "@/types/paper";

/**
 * Numbers are ALWAYS rendered with standard English digits (0-9), even on Urdu papers.
 * Urdu text stays RTL; only the numerals are Latin.
 */
export function num(input: string | number, _lang?: Language): string {
  return String(input);
}

/** Convenience for "5 Marks" / "50 Marks" labels (digits always English). */
export function marksText(value: string | number): string {
  return `${String(value)} Marks`;
}

export const MONTHS_UR: Record<string, string> = {
  January: "جنوری",
  February: "فروری",
  March: "مارچ",
  April: "اپریل",
  May: "مئی",
  June: "جون",
  July: "جولائی",
  August: "اگست",
  September: "ستمبر",
  October: "اکتوبر",
  November: "نومبر",
  December: "دسمبر",
};

export const CLASSES_UR: Record<string, string> = {
  Prep: "پریپ",
  "1st": "اول",
  "2nd": "دوم",
  "3rd": "سوم",
  "4th": "چہارم",
  "5th": "پنجم",
  "6th": "ششم",
  "7th": "ہفتم",
  "8th": "ہشتم",
  "9th": "نہم (نویں)",
  "10th": "دہم (دسویں)",
  "11th": "گیارہویں",
  "12th": "بارہویں",
};

export const SUBJECTS_UR: Record<string, string> = {
  English: "انگریزی",
  Urdu: "اردو",
  Mathematics: "ریاضی",
  Physics: "طبیعیات (فزکس)",
  Chemistry: "کیمیا (کیمسٹری)",
  Biology: "حیاتیات (بائیولوجی)",
  "Computer Science": "کمپیوٹر سائنس",
  "General Science": "جنرل سائنس",
  Islamiat: "اسلامیات",
  "Pakistan Studies": "مطالعہ پاکستان",
  "Social Studies": "معاشرتی علوم",
  "Tarjama-tul-Quran": "ترجمۃ القرآن",
  Geography: "جغرافیہ",
  History: "تاریخ",
  Arabic: "عربی",
  "General Knowledge": "معلومات عامہ",
};

export const EXAM_TITLES_UR: Record<string, string> = {
  "Monthly Test": "ماہانہ ٹیسٹ",
  "Weekly Test": "ہفتہ وار ٹیسٹ",
  "Mid Term": "وسط مدتی امتحان",
  "Mid Term Exam": "وسط مدتی امتحان",
  "Final Exam": "سالانہ امتحان",
  "Annual Exam": "سالانہ امتحان",
  "First Term": "پہلا ٹرم امتحان",
  "Send-up Exam": "سینڈ اپ امتحان",
  "Surprise Quiz": "اچانک ٹیسٹ",
  "Daily Test": "روزانہ ٹیسٹ",
};

export const MONTHS = Object.keys(MONTHS_UR);
export const CLASSES = Object.keys(CLASSES_UR);
export const SUBJECTS = Object.keys(SUBJECTS_UR);

export function tr(dict: Record<string, string>, value: string, lang: Language): string {
  if (lang !== "ur") return value;
  return dict[value] ?? value;
}

const LABELS = {
  name: { en: "Name", ur: "نام" },
  rollNo: { en: "Roll No", ur: "رول نمبر" },
  section: { en: "Section", ur: "سیکشن" },
  class: { en: "Class", ur: "جماعت" },
  subject: { en: "Subject", ur: "مضمون" },
  time: { en: "Time", ur: "وقت" },
  totalMarks: { en: "Total Marks", ur: "کل نمبر" },
  marks: { en: "Marks", ur: "نمبر" },
  sectionI: { en: "Section I — Multiple Choice Questions", ur: "حصہ اول — معروضی سوالات" },
  sectionII: { en: "Section II — Short Questions", ur: "حصہ دوم — مختصر سوالات" },
  sectionIII: { en: "Section III — Long Questions", ur: "حصہ سوم — تفصیلی سوالات" },
  blanksTitle: { en: "Fill in the Blanks", ur: "خالی جگہیں پُر کریں" },
  blanksHeading: { en: "Fill in the blanks.", ur: "خالی جگہیں پُر کریں۔" },
  translationTitle: { en: "Translation", ur: "ترجمہ" },
  translateToUrdu: { en: "Translate the following sentences into Urdu.", ur: "مندرجہ ذیل کا اردو میں ترجمہ کریں۔" },
  translateToEnglish: { en: "Translate the following sentences into English.", ur: "مندرجہ ذیل کا انگریزی میں ترجمہ کریں۔" },
  passageTitle: { en: "Comprehension / Paragraph", ur: "تفہیم عبارت / پیراگراف" },
  passageHeading: { en: "Read the following paragraph carefully and answer the questions below.", ur: "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔" },
  mathTitle: { en: "Mathematics / Equations", ur: "ریاضی / مساوات" },
  mathHeading: { en: "Solve the following mathematical questions / equations.", ur: "درج ذیل حسابی سوالات اور مساوات حل کریں۔" },
  partA: { en: "Part A", ur: "حصہ (الف)" },
  partB: { en: "Part B", ur: "حصہ (ب)" },
  q: { en: "Q.", ur: "سوال نمبر" },
  attempt: { en: "Attempt any", ur: "کوئی سے" },
  questions: { en: "questions", ur: "سوالات حل کریں" },
};

export type LabelKey = keyof typeof LABELS;

export function label(key: LabelKey, lang: Language): string {
  return LABELS[key][lang];
}

export const OPTION_LABELS: Record<Language, string[]> = {
  en: ["A", "B", "C", "D", "E", "F"],
  ur: ["الف", "ب", "ج", "د", "ہ", "و"],
};

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx", "xxi", "xxii", "xxiii", "xxiv", "xxv", "xxvi", "xxvii", "xxviii", "xxix", "xxx"];
export function roman(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}

export const SUBPART_LABELS: Record<Language, string[]> = {
  en: ["a", "b", "c", "d", "e", "f"],
  ur: ["الف", "ب", "ج", "د", "ہ", "و"],
};
