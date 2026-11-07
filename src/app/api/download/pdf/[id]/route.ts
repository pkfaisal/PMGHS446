import { db } from "@/db";
import { downloadLogs, papers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Logs a client-side PDF export (or print, via ?format=print) */
export async function POST(req: Request, ctx: RouteContext<"/api/download/pdf/[id]">) {
  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") === "print" ? "print" : "pdf";
  const paperId = Number(id);
  const [row] = await db.select({ examTitle: papers.examTitle, subject: papers.subject, className: papers.className }).from(papers).where(eq(papers.id, paperId));
  const title = row ? `${row.examTitle} · ${row.className} · ${row.subject}` : "Unsaved paper";
  await db.insert(downloadLogs).values({ paperId: row ? paperId : null, paperTitle: title, format });
  if (row) await db.update(papers).set({ downloads: sql`${papers.downloads} + 1` }).where(eq(papers.id, paperId));
  return Response.json({ ok: true });
}
