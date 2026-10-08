import "server-only";
import { randomUUID } from "node:crypto";
import type { CloudQuiz, QuizSummary } from "../cloud-types";
import type { Question } from "../quiz";
import { sameQuestions } from "../quiz";
import { database } from "./database";
import { ApiError } from "./api";

type QuizRow = { id: string; title: string; questions?: Question[]; question_count: number; revision: number; created_at: string; updated_at: string };
function summary(row: QuizRow): QuizSummary {
  return { id: row.id, title: row.title, questionCount: row.question_count, revision: row.revision, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
}
function full(row: QuizRow): CloudQuiz { return { ...summary(row), questions: row.questions! }; }

export async function listQuizzes(owner: string): Promise<QuizSummary[]> {
  const sql = database();
  const rows = await sql`SELECT id, title, question_count, revision, created_at, updated_at FROM quizly_quizzes WHERE owner_key = ${owner} ORDER BY updated_at DESC, id`;
  return (rows as QuizRow[]).map(summary);
}

export async function getQuiz(owner: string, id: string): Promise<CloudQuiz> {
  const sql = database();
  const [row] = await sql`SELECT * FROM quizly_quizzes WHERE id = ${id} AND owner_key = ${owner}`;
  if (!row) throw new ApiError(404, "That quiz no longer exists in this library.");
  return full(row as QuizRow);
}

export async function createQuiz(owner: string, title: string, questions: Question[]): Promise<{ quiz: CloudQuiz; created: boolean }> {
  const sql = database();
  const [row] = await sql`INSERT INTO quizly_quizzes (id, owner_key, title, title_key, questions, question_count)
    VALUES (${randomUUID()}, ${owner}, ${title}, ${title.toLowerCase()}, ${JSON.stringify(questions)}::jsonb, ${questions.length})
    ON CONFLICT (owner_key, title_key) DO NOTHING RETURNING *`;
  if (row) return { quiz: full(row as QuizRow), created: true };
  const [existing] = await sql`SELECT * FROM quizly_quizzes WHERE owner_key = ${owner} AND title_key = ${title.toLowerCase()}`;
  if (!existing) throw new ApiError(409, "The quiz library changed. Refresh it and try again.");
  return { quiz: full(existing as QuizRow), created: false };
}

export async function updateQuiz(owner: string, id: string, revision: number, title: string, questions: Question[]): Promise<CloudQuiz> {
  const current = await getQuiz(owner, id);
  // Opening/starting an unchanged quiz must not invalidate other visitors' edits.
  if (current.title === title && sameQuestions(current.questions, questions)) return current;
  const sql = database();
  const [row] = await sql`UPDATE quizly_quizzes SET title = ${title}, title_key = ${title.toLowerCase()}, questions = ${JSON.stringify(questions)}::jsonb,
    question_count = ${questions.length}, revision = revision + 1, updated_at = now()
    WHERE id = ${id} AND owner_key = ${owner} AND revision = ${revision} RETURNING *`;
  if (row) return full(row as QuizRow);
  await getQuiz(owner, id);
  throw new ApiError(409, "Someone updated this quiz. Open its latest saved version before saving your edits. Your draft is still available.");
}

export async function deleteQuiz(owner: string, id: string, revision: number) {
  const sql = database();
  const rows = await sql`DELETE FROM quizly_quizzes WHERE id = ${id} AND owner_key = ${owner} AND revision = ${revision} RETURNING id`;
  if (rows.length) return;
  await getQuiz(owner, id);
  throw new ApiError(409, "Someone updated this quiz. Refresh the library before deleting it.");
}
