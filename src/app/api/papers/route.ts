import { db } from "@/db";
import { papers } from "@/db/schema";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { PaperData } from "@/types/paper";
import { paperColumns } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const className = url.searchParams.get("className");
  const search = url.searchParams.get("search");
  const conds: SQL[] = [];
  if (subject) conds.push(eq(papers.subject, subject));
  if (className) conds.push(eq(papers.className, className));
  if (search) {
    const s = `%${search}%`;
    const c = or(ilike(papers.examTitle, s), ilike(papers.subject, s), ilike(papers.className, s));
    if (c) conds.push(c);
  }
  const rows = await db
    .select()
    .from(papers)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(papers.updatedAt));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { data?: PaperData };
  if (!body.data) return Response.json({ error: "Missing paper data" }, { status: 400 });
  const [row] = await db.insert(papers).values(paperColumns(body.data)).returning();
  return Response.json(row, { status: 201 });
}
