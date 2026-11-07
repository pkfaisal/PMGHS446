import { db } from "@/db";
import { downloadLogs, papers, questions } from "@/db/schema";
import { count, desc, gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [[paperCount], [questionCount], [monthCount], formatRows, history, subjectRows, typeRows] = await Promise.all([
    db.select({ n: count() }).from(papers),
    db.select({ n: count() }).from(questions),
    db.select({ n: count() }).from(papers).where(gte(papers.createdAt, monthStart)),
    db.select({ format: downloadLogs.format, n: count() }).from(downloadLogs).groupBy(downloadLogs.format),
    db.select().from(downloadLogs).orderBy(desc(downloadLogs.createdAt)).limit(25),
    db
      .select({ subject: papers.subject, n: count() })
      .from(papers)
      .groupBy(papers.subject)
      .orderBy(sql`count(*) desc`)
      .limit(8),
    db.select({ type: questions.type, n: count() }).from(questions).groupBy(questions.type),
  ]);

  const downloads = { pdf: 0, docx: 0, print: 0 } as Record<string, number>;
  formatRows.forEach((r) => (downloads[r.format] = Number(r.n)));
  const bank = { mcq: 0, short: 0, long: 0 } as Record<string, number>;
  typeRows.forEach((r) => (bank[r.type] = Number(r.n)));

  return Response.json({
    stats: {
      papers: Number(paperCount.n),
      questions: Number(questionCount.n),
      papersThisMonth: Number(monthCount.n),
      downloads,
      bank,
    },
    subjects: subjectRows.map((r) => ({ subject: r.subject || "—", count: Number(r.n) })),
    history,
  });
}
