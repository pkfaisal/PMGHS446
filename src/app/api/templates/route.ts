import { db } from "@/db";
import { templates } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { ensureTemplates } from "@/lib/server/store";
import type { TemplateConfig } from "@/types/paper";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureTemplates();
  const rows = await db.select().from(templates).orderBy(desc(templates.builtIn), asc(templates.id));
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; description?: string; config?: TemplateConfig };
  if (!body.name || !body.config) return Response.json({ error: "Name and config are required" }, { status: 400 });
  const [row] = await db
    .insert(templates)
    .values({ name: body.name, description: body.description ?? "", config: body.config, builtIn: false })
    .returning();
  return Response.json(row, { status: 201 });
}
