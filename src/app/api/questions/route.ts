import { db } from "@/db";
import { questions } from "@/db/schema";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

type QInput = {
  type: string;
  text: string;
  options?: string[];
  subParts?: { text: string; marks: number }[];
  marks?: number;
  subject?: string;
  className?: string;
  chapter?: string;
  language?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const conds: SQL[] = [];
  const subject = url.searchParams.get("subject");
  const className = url.searchParams.get("className");
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search");
  const language = url.searchParams.get("language");
  if (subject) conds.push(eq(questions.subject, subject));
  if (className) conds.push(eq(questions.className, className));
  if (type) conds.push(eq(questions.type, type));
  if (language) conds.push(eq(questions.language, language));
  if (search) conds.push(ilike(questions.text, `%${search}%`));
  const rows = await db
    .select()
    .from(questions)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(questions.createdAt))
    .limit(500);
  return Response.json(rows);
}

function normalize(q: QInput) {
  return {
    type: ["mcq", "short", "long"].includes(q.type) ? q.type : "short",
    text: String(q.text ?? "").trim(),
    options: Array.isArray(q.options) ? q.options.map(String) : [],
    subParts: Array.isArray(q.subParts) ? q.subParts.map((s) => ({ text: String(s.text), marks: Number(s.marks) || 0 })) : [],
    marks: Number(q.marks) || 1,
    subject: q.subject ?? "",
    className: q.className ?? "",
    chapter: q.chapter ?? "",
    language: q.language === "ur" ? "ur" : "en",
  };
}

/** Accepts a single question or { items: [...] } for bulk insert */
export async function POST(req: Request) {
  const body = (await req.json()) as QInput | { items: QInput[] };
  const items = "items" in body ? body.items : [body];
  const values = items.map(normalize).filter((q) => q.text);
  if (!values.length) return Response.json({ error: "No valid questions" }, { status: 400 });
  const rows = await db.insert(questions).values(values).returning();
  return Response.json("items" in body ? { inserted: rows.length } : rows[0], { status: 201 });
}
