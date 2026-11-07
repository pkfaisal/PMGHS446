import { db } from "@/db";
import { papers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { paperColumns } from "@/lib/server/store";
import type { PaperData } from "@/types/paper";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/papers/[id]">) {
  const { id } = await ctx.params;
  const [row] = await db.select().from(papers).where(eq(papers.id, Number(id)));
  if (!row) return Response.json({ error: "Paper not found" }, { status: 404 });
  return Response.json(row);
}

export async function PUT(req: Request, ctx: RouteContext<"/api/papers/[id]">) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { data?: PaperData };
  if (!body.data) return Response.json({ error: "Missing paper data" }, { status: 400 });
  const [row] = await db
    .update(papers)
    .set({ ...paperColumns(body.data), updatedAt: new Date() })
    .where(eq(papers.id, Number(id)))
    .returning();
  if (!row) return Response.json({ error: "Paper not found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/papers/[id]">) {
  const { id } = await ctx.params;
  await db.delete(papers).where(eq(papers.id, Number(id)));
  return Response.json({ ok: true });
}
