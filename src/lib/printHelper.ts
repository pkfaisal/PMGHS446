"use client";

/** Synchronous native print. CSS @media print hides everything but `.print-root`. */
export function printPaper(): void {
  document.body.classList.add("printing-paper");
  const cleanup = () => {
    document.body.classList.remove("printing-paper");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Safari fallback in case afterprint doesn't fire
  setTimeout(cleanup, 2000);
}
