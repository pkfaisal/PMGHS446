"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Scissors } from "lucide-react";
import type { PaperData, ShortQuestion } from "@/types/paper";
import { calculatePaperDensity, longMarks, sectionMarks, totalMarks, type Density } from "@/lib/paper";
import { OPTION_LABELS, label, num } from "@/lib/urdu";
import { balancedChunks, examLine, headerMeta, questionColumns } from "@/lib/layout";

const PAGE_H = 1122.5; // 297mm in px
const CUT_H = 22;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ------------------------------------------------------------------ */
/* AutoScaledCopy: measures content and zooms it down to always fit    */
/* ------------------------------------------------------------------ */
function AutoScaledCopy({ children, contentKey, showBadge }: { children: ReactNode; contentKey: string; showBadge: boolean }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useIsoLayoutEffect(() => {
    let cancelled = false;
    const fit = () => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i || cancelled) return;
      const W = o.clientWidth;
      const H = o.clientHeight;
      if (!W || !H) return;
      i.style.transform = "none";
      i.style.width = `${W}px`;
      if (i.offsetHeight <= H) {
        setScale(1);
        return;
      }
      // Binary search the largest scale s where content (reflowed at width W/s) * s fits H
      let lo = 0.25;
      let hi = 1;
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2;
        i.style.width = `${W / mid}px`;
        if (i.offsetHeight * mid <= H) lo = mid;
        else hi = mid;
      }
      i.style.width = `${W / lo}px`;
      i.style.transform = `scale(${lo})`;
      setScale(lo);
    };
    fit();
    document.fonts?.ready.then(() => !cancelled && fit());
    const ro = new ResizeObserver(() => fit());
    if (outer.current) ro.observe(outer.current);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, [contentKey]);

  return (
    <div ref={outer} className="relative h-full w-full overflow-hidden" style={{ direction: "ltr" }}>
      <div ref={inner} style={{ transformOrigin: "top left", width: "100%" }}>
        {children}
      </div>
      {showBadge && scale < 0.999 && (
        <div className="no-print absolute bottom-1 right-1 rounded bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 shadow-sm">
          Auto-fit {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PaperCopy: one full rendered copy of the exam paper                 */
/* ------------------------------------------------------------------ */
function PaperCopy({ p, density, copies }: { p: PaperData; density: Density; copies: 1 | 2 | 3 }) {
  const lang = p.language;
  const ur = lang === "ur";
  const multi = copies > 1;
  const marks = sectionMarks(p);
  const total = totalMarks(p);
  // Dynamic scale calculation based on question count & density
  const mcqCount = p.sections.mcq.enabled ? p.mcqs.length : 0;
  const shortCount = p.sections.short.enabled ? p.shorts.length : 0;
  const longCount = p.sections.long.enabled ? p.longs.length : 0;
  const totalQuestions = mcqCount + shortCount + longCount;

  // Dynamically increase font size and spacing when few questions, compact when many
  let baseSize: number;
  let gap: number;
  let sectionHeadGap: number;

  if (copies === 1) {
    if (density === "spacious" || totalQuestions <= 4) {
      baseSize = ur ? 18.5 : 17.5;
      gap = 20;
      sectionHeadGap = 24;
    } else if (density === "normal" || totalQuestions <= 8) {
      baseSize = ur ? 16 : 15;
      gap = 13;
      sectionHeadGap = 16;
    } else if (density === "compact" || totalQuestions <= 15) {
      baseSize = ur ? 14 : 13.5;
      gap = 8;
      sectionHeadGap = 10;
    } else if (density === "dense" || totalQuestions <= 22) {
      baseSize = ur ? 12.5 : 12;
      gap = 5;
      sectionHeadGap = 7;
    } else {
      baseSize = ur ? 11.5 : 11;
      gap = 3.5;
      sectionHeadGap = 5;
    }
  } else if (copies === 2) {
    if (density === "spacious" || totalQuestions <= 3) {
      baseSize = ur ? 15.5 : 14.5;
      gap = 12;
      sectionHeadGap = 14;
    } else if (density === "normal" || totalQuestions <= 6) {
      baseSize = ur ? 13.5 : 13;
      gap = 7;
      sectionHeadGap = 9;
    } else if (density === "compact" || totalQuestions <= 10) {
      baseSize = ur ? 12 : 11.5;
      gap = 4.5;
      sectionHeadGap = 6;
    } else {
      baseSize = ur ? 10.5 : 10;
      gap = 3;
      sectionHeadGap = 4;
    }
  } else {
    // 3 copies in 1 page (each slip is ~325px height)
    if (density === "spacious" || totalQuestions <= 2) {
      baseSize = ur ? 13.5 : 13;
      gap = 8;
      sectionHeadGap = 9;
    } else if (density === "normal" || totalQuestions <= 5) {
      baseSize = ur ? 11.8 : 11.5;
      gap = 4.5;
      sectionHeadGap = 5.5;
    } else if (density === "compact" || totalQuestions <= 8) {
      baseSize = ur ? 10.5 : 10.2;
      gap = 3;
      sectionHeadGap = 4;
    } else {
      baseSize = ur ? 9.5 : 9.2;
      gap = 1.8;
      sectionHeadGap = 2.5;
    }
  }

  const mcqCols = multi && (density === "compact" || density === "dense" || density === "ultra") ? 2 : 1;
  const shortCols = questionColumns(p.shorts.length, "short");
  const longCols = questionColumns(p.longs.length, "long");
  const meta = headerMeta(p);

  const showMcq = p.sections.mcq.enabled && p.mcqs.length > 0;
  const showShort = p.sections.short.enabled && p.shorts.length > 0;
  const showLong = p.sections.long.enabled && p.longs.length > 0;

  const attemptText = (n: number) =>
    n > 0 ? (ur ? ` ${label("attempt", lang)} ${num(n, lang)} ${label("questions", lang)}۔` : ` Attempt any ${n} questions.`) : "";

  /* Borderless, clean section heading */
  const SectionHead = ({ title, m, instr }: { title: string; m: number; instr: string }) => (
    <div style={{ marginTop: sectionHeadGap, marginBottom: gap / 2 }}>
      <div className="text-center font-bold" style={{ fontSize: "1.05em" }}>
        {title} <span className="font-semibold">({label("marks", lang)}: {num(m, lang)})</span>
      </div>
      {instr && (
        <div className="text-center italic text-black/75" style={{ fontSize: "0.85em", marginTop: 1 }}>
          {instr}
        </div>
      )}
    </div>
  );

  const studentFields = [
    p.showStudentName && { k: label("name", lang), w: "flex-[3]" },
    p.showRollNo && { k: label("rollNo", lang), w: "flex-[1.5]" },
    p.showSection && { k: label("section", lang), w: "flex-1" },
  ].filter(Boolean) as { k: string; w: string }[];

  // Long questions always restart at Q.1 (matches the Word export)
  const firstLongNo = 1;

  /* Short question list: sequential numbering across balanced columns */
  const shortGroups: { part: "" | "A" | "B"; list: ShortQuestion[] }[] = p.sections.short.splitParts
    ? [
        { part: "A", list: p.shorts.filter((s) => s.part === "A") },
        { part: "B", list: p.shorts.filter((s) => s.part === "B") },
      ]
    : [{ part: "", list: p.shorts }];

  const renderShortColumns = (list: ShortQuestion[], cols: 1 | 2, startNo: number) => {
    let running = startNo - 1;
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: 18, alignItems: "start" }}>
        {balancedChunks(list, cols).map((chunk, ci) => (
          <div key={ci} className="flex flex-col" style={{ rowGap: gap / 2 }}>
            {chunk.map((s) => {
              running++;
              return (
                <div key={s.id} className="break-inside-avoid">
                  <div className="flex gap-1">
                    <span className="shrink-0 font-semibold">{num(running, lang)}.</span>
                    <span>{s.text}</span>
                  </div>
                  {Array.from({ length: p.sections.short.answerLines }).map((_, l) => (
                    <div key={l} className="ms-6 border-b border-black/30" style={{ height: "1.5em" }} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  /* Long question list: sequential numbering across balanced columns */
  const renderLongColumns = () => {
    let running = firstLongNo - 1;
    return (
      <div className="grid" style={{ gridTemplateColumns: `repeat(${longCols}, minmax(0, 1fr))`, columnGap: 18, alignItems: "start" }}>
        {balancedChunks(p.longs, longCols).map((chunk, ci) => (
          <div key={ci} className="flex flex-col" style={{ rowGap: gap / 1.5 }}>
            {chunk.map((q) => {
              running++;
              return (
                <div key={q.id} className="break-inside-avoid">
                  <div className="flex gap-1">
                    <span className="shrink-0 font-bold">
                      {label("q", lang)} {num(running, lang)}:
                    </span>
                    <span className="flex-1">{q.text}</span>
                    {q.subParts.length === 0 && <span className="shrink-0 font-semibold">({num(longMarks(q), lang)})</span>}
                  </div>
                  {q.subParts.map((sp, j) => (
                    <div key={sp.id} className="flex gap-1 ps-5" style={{ fontSize: "0.97em" }}>
                      <span className="shrink-0 font-semibold">({num(j + 1, lang)})</span>
                      <span className="flex-1">{sp.text}</span>
                      <span className="shrink-0 font-semibold">({num(sp.marks, lang)})</span>
                    </div>
                  ))}
                  {q.subParts.length > 0 && (
                    <div className="ps-5 text-right font-semibold" style={{ fontSize: "0.9em" }}>
                      ({num(longMarks(q), lang)})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  let shortStart = 1;

  return (
    <div
      dir={ur ? "rtl" : "ltr"}
      lang={ur ? "ur" : "en"}
      className={`paper-copy copies-${copies} ${ur ? "urdu-text text-right" : "text-left"}`}
      style={{ fontSize: baseSize }}
    >
      {/* Header — no table, no borders, exact requested order */}
      <div className="text-center">
        <div className="font-extrabold tracking-tight" style={{ fontSize: copies === 1 ? "1.55em" : "1.32em", lineHeight: ur ? 1.9 : 1.22 }}>
          {p.schoolName}
        </div>
        <div className="font-semibold" style={{ fontSize: copies === 1 ? "1.1em" : "1em", lineHeight: ur ? 1.8 : 1.3 }}>
          {examLine(p)}
        </div>
        {/* Subject, Class, Time and Total Marks — on ONE single horizontal line with equal balanced spacing */}
        <div
          className="mt-1 grid grid-cols-4 items-center text-center w-full"
          style={{ fontSize: copies === 3 ? "0.85em" : "0.93em", lineHeight: ur ? 1.8 : 1.35 }}
        >
          {meta.map((m) => (
            <div key={m.label} className="truncate px-1">
              <span className="font-semibold">{m.label}:</span> {m.value}
            </div>
          ))}
        </div>
      </div>

      {studentFields.length > 0 && (
        <div className="flex gap-3" style={{ marginTop: gap / 1.5, fontSize: "0.92em" }}>
          {studentFields.map((f) => (
            <div key={f.k} className={`flex ${f.w} items-end gap-1`}>
              <span className="shrink-0 font-semibold">{f.k}:</span>
              <span className="mb-1 flex-1 border-b border-dotted border-black" />
            </div>
          ))}
        </div>
      )}

      {/* Question Sections rendered in clean, pedagogical sequence */}
      {(() => {
        let qCount = 1;
        const renderedSections = [];

        // 1. MCQs Section
        if (showMcq) {
          const qNum = qCount++;
          renderedSections.push(
            <section key="mcq">
              <SectionHead
                title={`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.mcq.instructions || label("sectionI", lang)}`}
                m={marks.mcq}
                instr={attemptText(p.sections.mcq.attempt)}
              />
              <div className="grid" style={{ gridTemplateColumns: `repeat(${mcqCols}, minmax(0, 1fr))`, columnGap: 16, rowGap: gap / 2 }}>
                {p.mcqs.map((m, i) => {
                  const opts = m.options.filter((o) => o.trim() !== "");
                  const longOpt = opts.some((o) => o.length > (mcqCols === 2 ? 14 : 28));
                  return (
                    <div key={m.id} className="break-inside-avoid">
                      <div className="flex gap-1">
                        <span className="shrink-0 font-bold">{num(i + 1, lang)}.</span>
                        <span>{m.text}</span>
                      </div>
                      <div
                        className="grid ps-4"
                        style={{ gridTemplateColumns: `repeat(${longOpt ? 2 : Math.min(4, Math.max(1, opts.length))}, minmax(0, 1fr))`, columnGap: 6, fontSize: "0.93em" }}
                      >
                        {opts.map((o, j) => (
                          <div key={j} className="flex gap-1">
                            <span className="font-semibold">({OPTION_LABELS[lang][j]})</span>
                            <span>{o}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        // 2. Fill in the Blanks Section
        const showBlanks = p.sections.blanks?.enabled && (p.blanks || []).length > 0;
        if (showBlanks) {
          const qNum = qCount++;
          const blanksList = p.blanks || [];
          renderedSections.push(
            <section key="blanks">
              <SectionHead
                title={`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.blanks?.instructions || (ur ? "خالی جگہیں پُر کریں۔" : "Fill in the blanks.")}`}
                m={marks.blanks}
                instr={attemptText(p.sections.blanks?.attempt || 0)}
              />
              <div className="flex flex-col" style={{ rowGap: gap / 2 }}>
                {blanksList.map((b, i) => (
                  <div key={b.id} className="flex gap-1.5 break-inside-avoid">
                    <span className="shrink-0 font-bold">{num(i + 1, lang)}.</span>
                    <span className="flex-1">
                      {(() => {
                        const parts = b.text.split(/(?:_{3,}|\[blank\])/i);
                        if (parts.length === 1) {
                          return (
                            <span>
                              {b.text}{" "}
                              <span className="inline-block border-b-2 border-black min-w-[85px] mx-1 align-baseline" />
                            </span>
                          );
                        }
                        return (
                          <span>
                            {parts.map((part, idx) => (
                              <span key={idx}>
                                {part}
                                {idx < parts.length - 1 && (
                                  <span className="inline-block border-b-2 border-black min-w-[85px] mx-1 align-baseline" />
                                )}
                              </span>
                            ))}
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 3. Translation Section
        const showTranslation = p.sections.translation?.enabled && (p.translations || []).length > 0;
        if (showTranslation) {
          const qNum = qCount++;
          const transList = p.translations || [];
          const targetIsUrdu = p.sections.translation?.targetLang === "ur";
          const defaultInstr = targetIsUrdu
            ? (ur ? "مندرجہ ذیل جملوں کا اردو میں ترجمہ کریں۔" : "Translate the following sentences into Urdu.")
            : (ur ? "مندرجہ ذیل جملوں کا انگریزی میں ترجمہ کریں۔" : "Translate the following sentences into English.");
          renderedSections.push(
            <section key="translation">
              <SectionHead
                title={`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.translation?.instructions || defaultInstr}`}
                m={marks.translation}
                instr={attemptText(p.sections.translation?.attempt || 0)}
              />
              <div className="flex flex-col" style={{ rowGap: gap / 2 }}>
                {transList.map((t, i) => (
                  <div key={t.id} className="flex gap-1.5 break-inside-avoid">
                    <span className="shrink-0 font-bold">{num(i + 1, lang)}.</span>
                    <span className="flex-1 font-medium">{t.text}</span>
                    {t.marks ? <span className="shrink-0 font-semibold text-xs">({num(t.marks, lang)})</span> : null}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 4. Passage / Paragraph Comprehension Section
        const showPassage = p.sections.passage?.enabled && (p.passages || []).length > 0;
        if (showPassage) {
          (p.passages || []).forEach((pass, pIdx) => {
            const qNum = qCount++;
            const defaultPassageInstr = ur
              ? "درج ذیل پیراگراف کو غور سے پڑھیں اور نیچے دیے گئے سوالات کے جوابات تحریر کریں۔"
              : "Read the following paragraph carefully and answer the questions below.";
            renderedSections.push(
              <section key={`passage-${pass.id || pIdx}`} className="break-inside-avoid">
                <SectionHead
                  title={`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.passage?.instructions || defaultPassageInstr}`}
                  m={(pass.subQuestions || []).reduce((acc, sq) => acc + (Number(sq.marks) || 0), 0)}
                  instr=""
                />
                <div className="rounded-lg border border-black/20 bg-slate-50/70 p-3 leading-relaxed text-justify my-1">
                  {pass.title && <div className="font-bold underline mb-1">{pass.title}</div>}
                  <div className="whitespace-pre-line">{pass.passageText}</div>
                </div>
                <div className="flex flex-col ps-2 mt-2" style={{ rowGap: gap / 2 }}>
                  {(pass.subQuestions || []).map((sq, sqIdx) => (
                    <div key={sq.id || sqIdx} className="flex gap-1.5">
                      <span className="shrink-0 font-semibold">({num(sqIdx + 1, lang)})</span>
                      <span className="flex-1">{sq.text}</span>
                      <span className="shrink-0 font-semibold">({num(sq.marks, lang)})</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          });
        }

        // 5. Mathematics & Equations Section
        const showMath = p.sections.math?.enabled && (p.maths || []).length > 0;
        if (showMath) {
          const qNum = qCount++;
          const mathList = p.maths || [];
          const defaultMathInstr = ur ? "درج ذیل حسابی سوالات اور مساوات حل کریں۔" : "Solve the following mathematical questions / equations.";
          renderedSections.push(
            <section key="math">
              <SectionHead
                title={`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.math?.instructions || defaultMathInstr}`}
                m={marks.math}
                instr={attemptText(p.sections.math?.attempt || 0)}
              />
              <div className="flex flex-col" style={{ rowGap: gap / 1.5 }}>
                {mathList.map((m, i) => (
                  <div key={m.id} className="break-inside-avoid border-b border-black/10 pb-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="shrink-0 font-bold">{num(i + 1, lang)}.</span>
                      <span className="flex-1 font-medium">{m.text}</span>
                      <span className="shrink-0 font-semibold">({num(m.marks, lang)})</span>
                    </div>
                    {m.equation && (
                      <div className="my-1 ps-6 font-mono font-bold tracking-wider text-[1.05em] py-0.5">
                        {m.equation}
                      </div>
                    )}
                    {m.subParts && m.subParts.length > 0 && (
                      <div className="ps-6 flex flex-col gap-1 mt-1">
                        {m.subParts.map((sp, spIdx) => (
                          <div key={sp.id || spIdx} className="flex gap-1 text-[0.95em]">
                            <span className="font-semibold">({num(spIdx + 1, lang)})</span>
                            <span className="flex-1">{sp.text}</span>
                            <span className="shrink-0 font-semibold">({num(sp.marks, lang)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        }

        // 6. Short Question Partitions (Board Style)
        const showPartitions = p.sections.shortPartitions?.enabled && (p.shortPartitions || []).length > 0;
        if (showPartitions) {
          (p.shortPartitions || []).forEach((part, pIdx) => {
            const qNum = qCount++;
            const pQuestions = part.questions || [];
            const attemptCount = part.attempt > 0 ? part.attempt : pQuestions.length;
            const partTitle = ur
              ? `سوال نمبر ${num(qNum, lang)}: مندرجہ ذیل ${num(pQuestions.length, lang)} میں سے کوئی سے ${num(attemptCount, lang)} سوالات کے مختصر جوابات تحریر کریں۔`
              : `Q.${num(qNum, lang)}: Write short answers to any ${attemptCount} of the following ${pQuestions.length} questions.`;
            const partMarks = attemptCount * (part.marksEach || 2);
            renderedSections.push(
              <section key={`short-part-${part.id || pIdx}`}>
                <SectionHead title={part.instructions || partTitle} m={partMarks} instr="" />
                {renderShortColumns(
                  pQuestions.map((q) => ({ id: q.id, text: q.text, part: "A" as const })),
                  questionColumns(pQuestions.length, "short"),
                  1
                )}
              </section>
            );
          });
        } else if (showShort) {
          // Standard Short Questions
          const qNum = qCount++;
          renderedSections.push(
            <section key="standard-short">
              <SectionHead
                title={`${label("q", lang)} ${num(qNum, lang)}: ${p.sections.short.instructions || label("sectionII", lang)}`}
                m={marks.short}
                instr={attemptText(p.sections.short.attempt)}
              />
              {shortGroups.map((g) => {
                if (!g.list.length) return null;
                const start = shortStart;
                shortStart += g.list.length;
                return (
                  <div key={g.part || "all"}>
                    {g.part && (
                      <div className="font-bold" style={{ fontSize: "0.95em", marginTop: gap / 3 }}>
                        {label(g.part === "A" ? "partA" : "partB", lang)}
                      </div>
                    )}
                    {renderShortColumns(g.list, questionColumns(g.list.length, "short"), start)}
                  </div>
                );
              })}
            </section>
          );
        }

        // 7. Long Questions Section
        if (showLong) {
          const longHeading = p.sections.long.attempt > 0
            ? (ur
                ? `حصہ سوم — تفصیلی سوالات (کوئی سے ${num(p.sections.long.attempt, lang)} سوالات حل کریں)`
                : `Section III — Long Questions (Attempt any ${p.sections.long.attempt} questions)`)
            : label("sectionIII", lang);
          renderedSections.push(
            <section key="long">
              <SectionHead
                title={p.sections.long.instructions || longHeading}
                m={marks.long}
                instr=""
              />
              {renderLongColumns()}
            </section>
          );
        }

        if (renderedSections.length === 0) {
          return (
            <div className="mt-8 text-center text-sm italic text-black/40">
              {ur ? "ابھی کوئی سوال شامل نہیں کیا گیا" : "No questions added yet — questions you add will appear here."}
            </div>
          );
        }

        return renderedSections;
      })()}
    </div>
  );
}

function CutLine() {
  return (
    <div className="relative flex shrink-0 items-center" style={{ height: CUT_H }}>
      <div className="cut-line w-full" />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-white px-1 text-neutral-600">
        <Scissors size={14} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PaperSheet: lays out pages and copies according to the copy mode    */
/* ------------------------------------------------------------------ */
export default function PaperSheet({ paper, showBadges = true, shadow = true }: { paper: PaperData; showBadges?: boolean; shadow?: boolean }) {
  const copies: 1 | 2 | 3 = paper.copyMode === "2in1" ? 2 : paper.copyMode === "3in1" ? 3 : 1;
  const pages = paper.copyMode === "2pages" ? 2 : 1;
  const marginPx = (paper.marginMm || 8) * 3.7795;
  const avail = (PAGE_H - marginPx * 2 - (copies - 1) * CUT_H) / copies;
  const density = calculatePaperDensity(paper, avail);
  const contentKey = JSON.stringify(paper);

  return (
    <div className="flex flex-col items-center gap-6">
      {Array.from({ length: pages }).map((_, pi) => (
        <div key={pi} className={`a4-page ${shadow ? "shadow-xl ring-1 ring-black/5" : ""}`} style={{ padding: marginPx }}>
          {Array.from({ length: copies }).map((_, ci) => (
            <Fragment key={ci}>
              {ci > 0 && <CutLine />}
              <div className="min-h-0 flex-1">
                <AutoScaledCopy contentKey={contentKey} showBadge={showBadges && ci === 0}>
                  <PaperCopy p={paper} density={density} copies={copies} />
                </AutoScaledCopy>
              </div>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Renders an unscaled copy of the paper directly under <body> for print & PDF export. */
export function PrintPortal({ paper, rootId = "print-root" }: { paper: PaperData; rootId?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="print-portal" id={rootId} aria-hidden>
      <PaperSheet paper={paper} showBadges={false} shadow={false} />
    </div>,
    document.body,
  );
}

export { PAGE_H };
