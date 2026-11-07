"use client";

import { downloadBlob, type DownloadResult } from "@/lib/download";

/**
 * Multi-tier high-resolution PDF export.
 * Pages (elements with class "a4-page") are cloned into a zero-offset hidden container
 * (fixed at 0,0 behind the body) so foreignObject rasterizers render at origin.
 */
const PAGE_W_PX = 794; // 210mm @ 96dpi
const PAGE_H_PX = 1123; // 297mm @ 96dpi
const PIXEL_RATIO = 2; // 192 DPI capture

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function rasterize(node: HTMLElement): Promise<string> {
  const { toJpeg } = await import("html-to-image");
  const base = {
    width: PAGE_W_PX,
    height: PAGE_H_PX,
    pixelRatio: PIXEL_RATIO,
    backgroundColor: "#ffffff",
    quality: 0.95,
    cacheBust: true,
    filter: (n: HTMLElement) => !(n.classList && n.classList.contains("no-print")),
  };
  const errors: string[] = [];

  // Tier 1: high fidelity with embedded web fonts (correct Nastaleeq shaping)
  try {
    const url = await withTimeout(toJpeg(node, { ...base, skipFonts: false }), 30000, "Font-embedded capture");
    if (url && url.length > 5000) return url;
    errors.push("tier 1 returned an empty image");
  } catch (e) {
    errors.push(`tier 1: ${e instanceof Error ? e.message : String(e)}`);
    console.warn("[pdf] tier 1 failed", e);
  }

  // Tier 2: skip font inspection (CORS-resilient)
  try {
    const url = await withTimeout(toJpeg(node, { ...base, skipFonts: true }), 20000, "Standard capture");
    if (url && url.length > 5000) return url;
    errors.push("tier 2 returned an empty image");
  } catch (e) {
    errors.push(`tier 2: ${e instanceof Error ? e.message : String(e)}`);
    console.warn("[pdf] tier 2 failed", e);
  }

  // Tier 3: direct canvas rasterization
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await withTimeout(
      html2canvas(node, {
        scale: PIXEL_RATIO,
        backgroundColor: "#ffffff",
        width: PAGE_W_PX,
        height: PAGE_H_PX,
        windowWidth: PAGE_W_PX,
        useCORS: true,
        logging: false,
      }),
      20000,
      "Canvas capture",
    );
    const url = canvas.toDataURL("image/jpeg", 0.95);
    if (url && url.length > 5000) return url;
    errors.push("tier 3 returned an empty image");
  } catch (e) {
    errors.push(`tier 3: ${e instanceof Error ? e.message : String(e)}`);
    console.warn("[pdf] tier 3 failed", e);
  }

  throw new Error(`Could not render the paper image. ${errors.join(" | ")}`);
}

export async function exportPagesToPdf(root: HTMLElement, fileName: string): Promise<DownloadResult> {
  const pages = Array.from(root.querySelectorAll<HTMLElement>(".a4-page"));
  if (!pages.length) throw new Error("Preview not ready — nothing to export.");

  if (document.fonts?.ready) {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]);
  }

  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "-99999",
    opacity: "1",
    visibility: "visible",
    pointerEvents: "none",
    width: `${PAGE_W_PX}px`,
    background: "#fff",
  } as CSSStyleDeclaration);
  document.body.appendChild(wrapper);

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

  try {
    for (let i = 0; i < pages.length; i++) {
      const clone = pages[i].cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".no-print").forEach((el) => el.remove());
      clone.style.margin = "0";
      clone.style.boxShadow = "none";
      clone.style.width = `${PAGE_W_PX}px`;
      clone.style.height = `${PAGE_H_PX}px`;
      wrapper.innerHTML = "";
      wrapper.appendChild(clone);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const img = await rasterize(clone);
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    const blob = pdf.output("blob");
    if (!blob || blob.size < 1500) throw new Error("The generated PDF looks empty. Please try again.");
    // Real browser download (appears in Chrome's Downloads list & folder)
    return await downloadBlob(blob, fileName);
  } finally {
    wrapper.remove();
  }
}
