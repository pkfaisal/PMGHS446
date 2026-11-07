import { db } from "@/db";
import { downloadLogs, papers } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generatePaperDocx } from "@/lib/server/docxGenerator";
import { paperFileName } from "@/lib/paper";
import type { PaperData } from "@/types/paper";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/download/docx/[id]">) {
  const { id } = await ctx.params;
  const paperId = Number(id);
  const [row] = await db.select().from(papers).where(eq(papers.id, paperId));
  if (!row) return Response.json({ error: "Paper not found" }, { status: 404 });
  const data = row.data as PaperData;
  const buffer = await generatePaperDocx(data);
  await db.insert(downloadLogs).values({ paperId, paperTitle: `${row.examTitle} · ${row.className} · ${row.subject}`, format: "docx" });
  await db.update(papers).set({ downloads: sql`${papers.downloads} + 1` }).where(eq(papers.id, paperId));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${paperFileName(data, "docx")}"`,
    },
  });
}
