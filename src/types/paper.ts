export type Language = "en" | "ur";
export type CopyMode = "1" | "2in1" | "3in1" | "2pages";
export type QuestionType = "mcq" | "short" | "long" | "blank" | "translation" | "passage" | "math";

export interface MCQ {
  id: string;
  text: string;
  options: string[];
}

export interface ShortQuestion {
  id: string;
  text: string;
  part: "A" | "B";
}

export interface SubPart {
  id: string;
  text: string;
  marks: number;
}

export interface LongQuestion {
  id: string;
  text: string;
  marks: number;
  subParts: SubPart[];
}

export interface BlankQuestion {
  id: string;
  text: string;
  answer?: string;
}

export interface TranslationItem {
  id: string;
  text: string;
  marks?: number;
}

export interface PassageSubQuestion {
  id: string;
  text: string;
  marks: number;
}

export interface PassageQuestion {
  id: string;
  title?: string;
  passageText: string;
  subQuestions: PassageSubQuestion[];
}

export interface MathQuestion {
  id: string;
  text: string;
  equation?: string;
  marks: number;
  subParts?: SubPart[];
}

export interface ShortPartitionItem {
  id: string;
  text: string;
}

export interface ShortPartition {
  id: string;
  title?: string;
  instructions?: string;
  attempt: number;    // e.g. 5
  marksEach: number;  // e.g. 2
  questions: ShortPartitionItem[];
}

export interface SectionConfig {
  enabled: boolean;
  marksEach: number;
  instructions: string;
  attempt: number; // 0 = attempt all
}

export interface ShortSectionConfig extends SectionConfig {
  splitParts: boolean;
  answerLines: number;
  usePartitions?: boolean;
}

export interface TranslationSectionConfig extends SectionConfig {
  targetLang: "ur" | "en"; // "ur" = Translate to Urdu, "en" = Translate to English
}

export interface PassageSectionConfig extends SectionConfig {
  passageTitle?: string;
}

export interface PaperSections {
  mcq: SectionConfig;
  blanks?: SectionConfig;
  translation?: TranslationSectionConfig;
  passage?: PassageSectionConfig;
  math?: SectionConfig;
  short: ShortSectionConfig;
  shortPartitions?: SectionConfig;
  long: SectionConfig;
}

export interface PaperData {
  schoolName: string;
  examTitle: string;
  className: string;
  subject: string;
  month: string;
  year: string;
  timeAllowed: string;
  totalMarks: number; // 0 = auto
  language: Language;
  showStudentName: boolean;
  showRollNo: boolean;
  showSection: boolean;
  copyMode: CopyMode;
  marginMm: number;
  sections: PaperSections;
  mcqs: MCQ[];
  blanks?: BlankQuestion[];
  translations?: TranslationItem[];
  passages?: PassageQuestion[];
  maths?: MathQuestion[];
  shorts: ShortQuestion[];
  shortPartitions?: ShortPartition[];
  longs: LongQuestion[];
}

export interface PaperRecord {
  id: number;
  examTitle: string;
  subject: string;
  className: string;
  language: Language;
  copyMode: CopyMode;
  totalMarks: number;
  data: PaperData;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankQuestion {
  id: number;
  type: QuestionType;
  text: string;
  options: string[];
  subParts: { text: string; marks: number }[];
  marks: number;
  subject: string;
  className: string;
  chapter: string;
  language: Language;
  createdAt: string;
}

export interface SchoolSettings {
  schoolName: string;
  schoolNameUrdu: string;
  address: string;
  defaultLanguage: Language;
  defaultCopyMode: CopyMode;
  defaultMarginMm: number;
  defaultTimeAllowed: string;
  examTitles: string[];
  mcqInstructions: string;
  shortInstructions: string;
  longInstructions: string;
  blanksInstructions?: string;
  translationInstructions?: string;
  passageInstructions?: string;
  mathInstructions?: string;
  mcqInstructionsUrdu: string;
  shortInstructionsUrdu: string;
  longInstructionsUrdu: string;
  blanksInstructionsUrdu?: string;
  translationInstructionsUrdu?: string;
  passageInstructionsUrdu?: string;
  mathInstructionsUrdu?: string;
}

export interface TemplateConfig {
  examTitle: string;
  copyMode: CopyMode;
  language: Language;
  timeAllowed: string;
  showStudentName: boolean;
  showRollNo: boolean;
  showSection: boolean;
  sections: PaperData["sections"];
}

export interface TemplateRecord {
  id: number;
  name: string;
  description: string;
  config: TemplateConfig;
  builtIn: boolean;
  createdAt: string;
}

export interface DownloadLog {
  id: number;
  paperId: number | null;
  paperTitle: string;
  format: "pdf" | "docx" | "print";
  createdAt: string;
}
