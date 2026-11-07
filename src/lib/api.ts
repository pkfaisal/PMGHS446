import type { BankQuestion, DownloadLog, PaperData, PaperRecord, SchoolSettings, TemplateConfig, TemplateRecord } from "@/types/paper";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

const qs = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && s.set(k, v));
  const str = s.toString();
  return str ? `?${str}` : "";
};

export interface DashboardData {
  stats: {
    papers: number;
    questions: number;
    papersThisMonth: number;
    downloads: Record<string, number>;
    bank: Record<string, number>;
  };
  subjects: { subject: string; count: number }[];
  history: DownloadLog[];
}

export interface OcrResult {
  language: "en" | "ur";
  mcqs: { text: string; options: string[] }[];
  shorts: { text: string }[];
  longs: { text: string; marks?: number; subParts?: { text: string; marks?: number }[] }[];
}

export const api = {
  papers: {
    list: (p: { subject?: string; className?: string; search?: string } = {}) => req<PaperRecord[]>(`/api/papers${qs(p)}`),
    get: (id: number) => req<PaperRecord>(`/api/papers/${id}`),
    create: (data: PaperData) => req<PaperRecord>("/api/papers", { method: "POST", body: JSON.stringify({ data }) }),
    update: (id: number, data: PaperData) => req<PaperRecord>(`/api/papers/${id}`, { method: "PUT", body: JSON.stringify({ data }) }),
    remove: (id: number) => req<{ ok: boolean }>(`/api/papers/${id}`, { method: "DELETE" }),
    duplicate: (id: number) => req<PaperRecord>(`/api/papers/${id}/duplicate`, { method: "POST" }),
  },
  questions: {
    list: (p: { subject?: string; className?: string; type?: string; search?: string; language?: string } = {}) =>
      req<BankQuestion[]>(`/api/questions${qs(p)}`),
    create: (q: Partial<BankQuestion>) => req<BankQuestion>("/api/questions", { method: "POST", body: JSON.stringify(q) }),
    bulkCreate: (items: Partial<BankQuestion>[]) =>
      req<{ inserted: number }>("/api/questions", { method: "POST", body: JSON.stringify({ items }) }),
    update: (id: number, q: Partial<BankQuestion>) => req<BankQuestion>(`/api/questions/${id}`, { method: "PUT", body: JSON.stringify(q) }),
    remove: (id: number) => req<{ ok: boolean }>(`/api/questions/${id}`, { method: "DELETE" }),
    importFromPaper: (paperId: number) =>
      req<{ inserted: number; skipped: number }>(`/api/questions/import-from-paper/${paperId}`, { method: "POST" }),
  },
  settings: {
    get: () => req<SchoolSettings>("/api/settings"),
    save: (s: Partial<SchoolSettings>) => req<SchoolSettings>("/api/settings", { method: "PUT", body: JSON.stringify(s) }),
  },
  templates: {
    list: () => req<TemplateRecord[]>("/api/templates"),
    get: (id: number) => req<TemplateRecord>(`/api/templates/${id}`),
    create: (name: string, description: string, config: TemplateConfig) =>
      req<TemplateRecord>("/api/templates", { method: "POST", body: JSON.stringify({ name, description, config }) }),
    remove: (id: number) => req<{ ok: boolean }>(`/api/templates/${id}`, { method: "DELETE" }),
  },
  downloads: {
    logPdf: (id: number, format: "pdf" | "print" = "pdf") =>
      req<{ ok: boolean }>(`/api/download/pdf/${id}${format === "print" ? "?format=print" : ""}`, { method: "POST" }).catch(() => null),
    history: () => req<DashboardData>("/api/download-history"),
    docxUrl: (id: number) => `/api/download/docx/${id}`,
  },
  ocr: {
    status: () => req<{ configured: boolean }>("/api/ocr/extract"),
    extract: (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      return req<OcrResult>("/api/ocr/extract", { method: "POST", body: fd });
    },
  },
};
