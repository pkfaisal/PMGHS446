import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: RouteContext<"/api/questions/[id]">) {
  const { id } = await ctx.params;
  const b = (await req.json()) as Record<string, unknown>;
  const [row] = await db
    .update(questions)
    .set({
      type: String(b.type ?? "short"),
      text: String(b.text ?? ""),
      options: Array.isArray(b.options) ? (b.options as string[]) : [],
      subParts: Array.isArray(b.subParts) ? (b.subParts as { text: string; marks: number }[]) : [],
      marks: Number(b.marks) || 1,
      subject: String(b.subject ?? ""),
      className: String(b.className ?? ""),
      chapter: String(b.chapter ?? ""),
      language: b.language === "ur" ? "ur" : "en",
    })
    .where(eq(questions.id, Number(id)))
    .returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/questions/[id]">) {
  const { id } = await ctx.params;
  await db.delete(questions).where(eq(questions.id, Number(id)));
  return Response.json({ ok: true });
}
