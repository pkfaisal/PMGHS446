import { getSettings, saveSettings } from "@/lib/server/store";
import type { SchoolSettings } from "@/types/paper";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getSettings());
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<SchoolSettings>;
  return Response.json(await saveSettings(body));
}
