import "server-only";
import { parseQuiz, type Question } from "../quiz";
import { scoreQuiz, type Answers, type QuizSettings } from "../session";
import { ApiError, validUuid } from "./api";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "Request data must be an object.");
  return value as Record<string, unknown>;
}

function text(value: unknown, maxLength: number, label: string) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) throw new ApiError(400, `${label} must contain between 1 and ${maxLength} characters.`);
  return value.trim();
}

function questions(value: unknown): Question[] {
  const result = parseQuiz(JSON.stringify(value ?? null), "json");
  if (!result.ok) throw new ApiError(400, result.error);
  if (result.warnings.length) throw new ApiError(400, result.warnings[0]);
  return result.questions;
}

export function validateQuiz(value: unknown) {
  const data = object(value);
  const title = text(data.title, 180, "Quiz name");
  const items = questions(data.questions);
  if (data.revision !== undefined && (!Number.isInteger(data.revision) || Number(data.revision) < 1)) throw new ApiError(400, "Invalid quiz revision.");
  return { title, questions: items, revision: data.revision as number | undefined };
}

export function validateAttempt(value: unknown) {
  const data = object(value);
  if (!validUuid(data.id)) throw new ApiError(400, "Invalid attempt ID.");
  if (data.quizId !== undefined && !validUuid(data.quizId)) throw new ApiError(400, "Invalid quiz ID.");
  const subject = text(data.subject, 360, "Quiz name");
  const items = questions(data.questions);
  const answers: Answers = Object.create(null);
  const rawAnswers = object(data.answers);
  const byId = new Map(items.map((question) => [question.id, question]));
  for (const [id, answer] of Object.entries(rawAnswers)) {
    const question = byId.get(id);
    if (!question || typeof answer !== "string" || !question.options.some((option) => option.key === answer)) throw new ApiError(400, "An answer does not match its question.");
    answers[id] = answer;
  }
  if (typeof data.elapsedMs !== "number" || !Number.isSafeInteger(data.elapsedMs) || data.elapsedMs < 0 || data.elapsedMs > 31536000000) throw new ApiError(400, "Invalid elapsed time.");
  const rawSettings = object(data.settings);
  if (["shuffleQuestions", "shuffleOptions", "instantFeedback"].some((key) => typeof rawSettings[key] !== "boolean")) throw new ApiError(400, "Invalid quiz settings.");
  const settings: QuizSettings = {
    shuffleQuestions: rawSettings.shuffleQuestions as boolean,
    shuffleOptions: rawSettings.shuffleOptions as boolean,
    instantFeedback: rawSettings.instantFeedback as boolean,
  };
  return { id: data.id, quizId: data.quizId as string | undefined, subject, questions: items, answers, elapsedMs: data.elapsedMs, settings, stats: scoreQuiz(items, answers) };
}
