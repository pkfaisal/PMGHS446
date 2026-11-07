"use client";

/**
 * Reliable browser file download.
 * Creates a real Blob URL, clicks a real <a download> element attached to the DOM,
 * and keeps the URL alive so the UI can offer a manual fallback link if the browser
 * blocks the programmatic download.
 */
export interface DownloadResult {
  fileName: string;
  size: number;
  url: string;
}

const liveUrls: string[] = [];

export async function downloadBlob(blob: Blob, fileName: string): Promise<DownloadResult> {
  if (!blob || blob.size === 0) throw new Error("The generated file is empty.");

  // Housekeeping: release URLs from previous downloads (kept long enough for manual saving)
  while (liveUrls.length > 3) {
    const old = liveUrls.shift();
    if (old) URL.revokeObjectURL(old);
  }

  const url = URL.createObjectURL(blob);
  liveUrls.push(url);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(a);

  a.click();

  // Give the browser time to register the download before cleaning up the anchor
  await new Promise((resolve) => setTimeout(resolve, 60));
  a.remove();

  return { fileName, size: blob.size, url };
}
