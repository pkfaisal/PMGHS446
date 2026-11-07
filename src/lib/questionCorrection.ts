import type { Language } from "@/types/paper";

/**
 * Intelligent, safe typo and formatting correction for Pakistani school examination questions.
 * Preserves mathematical expressions, symbols, formulas, and numerals intact.
 * Never aggressively rewrites sentences.
 */

// Common English examination misspellings
const ENGLISH_TYPOS: Record<string, string> = {
  defination: "definition",
  definations: "definitions",
  differenciate: "differentiate",
  diffrentiate: "differentiate",
  diferentiate: "differentiate",
  explaination: "explanation",
  explainations: "explanations",
  seperate: "separate",
  seperately: "separately",
  untill: "until",
  occured: "occurred",
  occuring: "occurring",
  grammer: "grammar",
  temprature: "temperature",
  tempreture: "temperature",
  recieved: "received",
  accelaration: "acceleration",
  accelration: "acceleration",
  gravitaional: "gravitational",
  gravitationl: "gravitational",
  photosinthesis: "photosynthesis",
  photosynthesise: "photosynthesis",
  resperation: "respiration",
  electon: "electron",
  electons: "electrons",
  electorn: "electron",
  princple: "principle",
  princples: "principles",
  statment: "statement",
  statments: "statements",
  charecteristic: "characteristic",
  charecteristics: "characteristics",
  charateristic: "characteristic",
  charateristics: "characteristics",
  propeties: "properties",
  proprties: "properties",
  properies: "properties",
  distingush: "distinguish",
  calcualte: "calculate",
  calulate: "calculate",
  vaccum: "vacuum",
  veloicty: "velocity",
  velcity: "velocity",
  frequencey: "frequency",
  magnitute: "magnitude",
  equilibirum: "equilibrium",
  equilbrium: "equilibrium",
  funtion: "function",
  funtions: "functions",
  structur: "structure",
  structures: "structures",
  diasgram: "diagram",
  diagrame: "diagram",
  exampel: "example",
  exampels: "examples",
  soluton: "solution",
  solutuon: "solution",
  qustion: "question",
  queston: "question",
  quesiton: "question",
  formla: "formula",
  formlas: "formulas",
  measurment: "measurement",
  measurments: "measurements",
  folloing: "following",
  fallowing: "following",
  followings: "following",
  conservaton: "conservation",
  potental: "potential",
  kinatic: "kinetic",
  kintic: "kinetic",
  coefficent: "coefficient",
  centripital: "centripetal",
  resistence: "resistance",
  capactior: "capacitor",
  capaciter: "capacitor",
  electic: "electric",
  electical: "electrical",
  atomoc: "atomic",
  chemestry: "chemistry",
  biologi: "biology",
  biolgy: "biology",
  matematics: "mathematics",
  mathmatics: "mathematics",
  proove: "prove",
  newtan: "Newton",
  neuton: "Newton",
};

// Common Urdu exam phrasing/spelling corrections
const URDU_PHRASE_FIXES: [RegExp, string][] = [
  [/\bواضع\s+کریں/g, "واضح کریں"],
  [/\bواضع\s+کیجیے/g, "واضح کیجیے"],
  [/\bواضع\s+کرئیں/g, "واضح کریں"],
  [/\bتعریف\s+کرئیں/g, "تعریف کریں"],
  [/\bموازنہ\s+کرئیں/g, "موازنہ کریں"],
  [/\bوضاحت\s+کرئیں/g, "وضاحت کریں"],
  [/\bبیان\s+کرئیں/g, "بیان کریں"],
  [/\bتحریر\s+کرئیں/g, "تحریر کریں"],
  [/\bتبدیلی\s+کی\s+شرع\b/g, "تبدیلی کی شرح"],
  [/\bدرج\s+زیل\b/g, "درج ذیل"],
];

function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement.toLowerCase();
}

/**
 * Checks if a token looks like a scientific formula, math expression, or unit that should not be touched.
 */
function isFormulaOrSymbol(word: string): boolean {
  if (/[0-9=+\-*/^_{}\\]/.test(word)) return true;
  if (/^[A-Z]{2,}$/.test(word)) return true; // e.g. SI, DNA, RNA, ATP, EMF
  if (/^(cm|mm|km|ms|kg|mol|cd|kJ|kW|kWh|Hz|MHz|GHz|Pa|kPa|MPa|atm|cal|kcal)$/i.test(word)) return true;
  return false;
}

/**
 * Safe autocorrection for single question statement or option text.
 */
export function correctQuestionText(raw: string, lang?: Language): string {
  if (!raw || typeof raw !== "string") return "";
  let text = raw;

  // 1. Whitespace cleanup
  text = text.replace(/[ \t]+/g, " ");

  // Detect Urdu text presence if lang not specified
  const isUrdu = lang === "ur" || /[\u0600-\u06FF]/.test(text);

  if (isUrdu) {
    // Standardize Arabic character forms to standard Urdu
    text = text
      .replace(/ك/g, "ک")
      .replace(/ي(?=[\s،۔؟]|$)/g, "ی"); // final Yeh with two dots to Urdu Choti Yeh

    // Apply known exam phrase spelling fixes
    for (const [re, rep] of URDU_PHRASE_FIXES) {
      text = text.replace(re, rep);
    }

    // Urdu punctuation spacing
    text = text
      .replace(/\s+([؟،۔])/g, "$1")
      .replace(/؟{2,}/g, "؟")
      .replace(/،{2,}/g, "،")
      .replace(/۔{2,}/g, "۔");

    // Replace English question mark / comma at the end of Urdu question
    text = text.replace(/\?+$/g, "؟").replace(/,\s*$/g, "،");
  } else {
    // English punctuation spacing
    text = text
      .replace(/\s+([,.:;?!])/g, "$1")
      .replace(/([,.:;?!])([A-Za-z])/g, "$1 $2")
      .replace(/\?{2,}/g, "?")
      .replace(/!{2,}/g, "!")
      .replace(/,{2,}/g, ",");

    // Word-by-word spelling correction (skipping formulas/symbols)
    text = text.replace(/\b[A-Za-z]+\b/g, (word) => {
      if (isFormulaOrSymbol(word)) return word;
      const lower = word.toLowerCase();
      const fixed = ENGLISH_TYPOS[lower];
      if (fixed) return matchCase(word, fixed);
      return word;
    });

    // Auto-capitalize the first letter of English question if starts with letter
    const trimmed = text.trim();
    if (/^[a-z]/.test(trimmed)) {
      text = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
  }

  return text.trim();
}
