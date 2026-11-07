import { GoogleGenAI, Type } from "@google/genai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PROMPT = `You are an expert Pakistani school examination assistant.
Extract every examination question visible in this image (textbook page, exercise, or old paper).
Classify each one:
- "mcqs": multiple choice questions with their options (keep 4 options, without the a/b/c/d labels).
- "shorts": short-answer questions (definitions, one-line or brief answers).
- "longs": long/detailed questions. If the question has sub-parts (a), (b) put them in subParts with estimated marks.
Keep the original language exactly (Urdu stays in Urdu script, English in English). Do not translate.
Remove question numbering prefixes. Do not invent questions that are not in the image.`;

export async function GET() {
  return Response.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI OCR is not configured. Add GEMINI_API_KEY to the environment to enable image scanning." },
      { status: 503 },
    );
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!file || typeof file === "string") return Response.json({ error: "No image uploaded (field 'image')" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Image too large (max 10 MB)" }, { status: 413 });
  const mimeType = file.type || "image/jpeg";
  if (!mimeType.startsWith("image/") && mimeType !== "application/pdf")
    return Response.json({ error: "Unsupported file type" }, { status: 415 });

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }, { text: PROMPT }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING, description: "en or ur" },
            mcqs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { text: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } } },
                required: ["text", "options"],
              },
            },
            shorts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ["text"] } },
            longs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  marks: { type: Type.NUMBER },
                  subParts: {
                    type: Type.ARRAY,
                    items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, marks: { type: Type.NUMBER } }, required: ["text"] },
                  },
                },
                required: ["text"],
              },
            },
          },
          required: ["mcqs", "shorts", "longs"],
        },
      },
    });
    const parsed = JSON.parse(res.text ?? "{}") as {
      language?: string;
      mcqs?: { text: string; options: string[] }[];
      shorts?: { text: string }[];
      longs?: { text: string; marks?: number; subParts?: { text: string; marks?: number }[] }[];
    };
    return Response.json({
      language: parsed.language === "ur" ? "ur" : "en",
      mcqs: parsed.mcqs ?? [],
      shorts: parsed.shorts ?? [],
      longs: parsed.longs ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: `Gemini extraction failed: ${msg}` }, { status: 502 });
  }
}
