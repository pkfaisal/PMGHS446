import { db } from "@/db";
import { papers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { paperColumns } from "@/lib/server/store";
import type { PaperData } from "@/types/paper";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RouteContext<"/api/papers/[id]/duplicate">) {
  const { id } = await ctx.params;
  const [row] = await db.select().from(papers).where(eq(papers.id, Number(id)));
  if (!row) return Response.json({ error: "Paper not found" }, { status: 404 });
  const data = { ...(row.data as PaperData) };
  data.examTitle = `${data.examTitle} (Copy)`;
  const [copy] = await db.insert(papers).values(paperColumns(data)).returning();
  return Response.json(copy, { status: 201 });
}
