import { db } from "@/db";
import { templates } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/templates/[id]">) {
  const { id } = await ctx.params;
  const [row] = await db.select().from(templates).where(eq(templates.id, Number(id)));
  if (!row) return Response.json({ error: "Template not found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/templates/[id]">) {
  const { id } = await ctx.params;
  await db.delete(templates).where(and(eq(templates.id, Number(id)), eq(templates.builtIn, false)));
  return Response.json({ ok: true });
}
