import "server-only";
import type { AttemptSummary, CloudAttempt } from "../cloud-types";
import type { Answers, QuizSettings } from "../session";
import type { Question } from "../quiz";
import { database } from "./database";
import { ApiError } from "./api";
import type { validateAttempt } from "./validation";

type AttemptRow = { id: string; quiz_id: string | null; subject: string; question_count: number; correct: number; wrong: number; skipped: number; elapsed_ms: number | string; completed_at: string; questions?: Question[]; answers?: Answers; settings?: QuizSettings };
function summary(row: AttemptRow): AttemptSummary {
  return { id: row.id, quizId: row.quiz_id, subject: row.subject, questionCount: row.question_count, correct: row.correct, wrong: row.wrong, skipped: row.skipped, elapsedMs: Number(row.elapsed_ms), completedAt: new Date(row.completed_at).toISOString() };
}

export async function saveAttempt(owner: string, library: string, attempt: ReturnType<typeof validateAttempt>): Promise<AttemptSummary> {
  const sql = database();
  const [row] = await sql`INSERT INTO quizly_attempts (id, owner_key, quiz_id, subject, questions, answers, settings, elapsed_ms, correct, wrong, skipped, question_count)
    VALUES (${attempt.id}, ${owner}, (SELECT id FROM quizly_quizzes WHERE id = ${attempt.quizId ?? null} AND owner_key = ${library}),
    ${attempt.subject}, ${JSON.stringify(attempt.questions)}::jsonb, ${JSON.stringify(attempt.answers)}::jsonb, ${JSON.stringify(attempt.settings)}::jsonb,
    ${attempt.elapsedMs}, ${attempt.stats.correct}, ${attempt.stats.wrong}, ${attempt.stats.skipped}, ${attempt.questions.length})
    ON CONFLICT (id) DO NOTHING RETURNING *`;
  if (row) return summary(row as AttemptRow);
  const [existing] = await sql`SELECT * FROM quizly_attempts WHERE id = ${attempt.id} AND owner_key = ${owner}`;
  if (!existing) throw new ApiError(409, "Attempt ID is already in use.");
  return summary(existing as AttemptRow);
}

export async function listAttempts(owner: string): Promise<AttemptSummary[]> {
  const sql = database();
  const rows = await sql`SELECT id, quiz_id, subject, question_count, correct, wrong, skipped, elapsed_ms, completed_at FROM quizly_attempts WHERE owner_key = ${owner} ORDER BY completed_at DESC, id LIMIT 100`;
  return (rows as AttemptRow[]).map(summary);
}

export async function getAttempt(owner: string, id: string): Promise<CloudAttempt> {
  const sql = database();
  const [row] = await sql`SELECT * FROM quizly_attempts WHERE owner_key = ${owner} AND id = ${id}`;
  if (!row) throw new ApiError(404, "That attempt is unavailable in this browser's history.");
  const record = row as AttemptRow;
  return { ...summary(record), questions: record.questions!, answers: record.answers!, settings: record.settings! };
}
