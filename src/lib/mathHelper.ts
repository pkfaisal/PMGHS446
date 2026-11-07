/**
 * Mathematical symbols and formula formatting helpers for question papers.
 */

export const MATH_SYMBOLS = [
  { label: "+", insert: " + " },
  { label: "−", insert: " - " },
  { label: "×", insert: " × " },
  { label: "÷", insert: " ÷ " },
  { label: "=", insert: " = " },
  { label: "≠", insert: " ≠ " },
  { label: "±", insert: " ± " },
  { label: "≤", insert: " ≤ " },
  { label: "≥", insert: " ≥ " },
  { label: "≈", insert: " ≈ " },
  { label: "√", insert: "√" },
  { label: "x²", insert: "²" },
  { label: "x³", insert: "³" },
  { label: "xⁿ", insert: "ⁿ" },
  { label: "x₁", insert: "₁" },
  { label: "x₂", insert: "₂" },
  { label: "½", insert: "½" },
  { label: "⅓", insert: "⅓" },
  { label: "¼", insert: "¼" },
  { label: "¾", insert: "¾" },
  { label: "π", insert: "π" },
  { label: "θ", insert: "θ" },
  { label: "α", insert: "α" },
  { label: "β", insert: "β" },
  { label: "Δ", insert: "Δ" },
  { label: "°", insert: "°" },
  { label: "∠", insert: "∠" },
  { label: "∞", insert: "∞" },
  { label: "∈", insert: "∈" },
  { label: "∵", insert: "∵" },
  { label: "∴", insert: "∴" },
  { label: "a/b", insert: "a/b" },
];

/**
 * Format mathematical text cleanly for display in the paper.
 */
export function formatEquationText(text: string): string {
  if (!text) return "";
  // Ensure math operators have clean single spaces around them
  return text
    .replace(/\s*([=+\-×÷≠±≤≥≈])\s*/g, " $1 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
