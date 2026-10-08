import { parseQuiz, type ImportFormat, type Question } from "./quiz";
import { DEFAULT_SETTINGS, type QuizSettings, type Stage } from "./session";

export const DRAFT_KEY = "quizly:draft";
export const LIBRARY_KEY = "quizly:library:v1";
export const SESSION_KEY = "quizly:session:v1";
export type Draft = { subject: string; raw: string; format: ImportFormat; settings: QuizSettings; cloudId?: string; cloudRevision?: number };
export type SavedQuiz = { id: string; title: string; questions: Question[]; updatedAt: string };

export function readStored(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); }
  catch { return null; }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function readSettings(value: unknown): QuizSettings {
  const data = record(value);
  return {
    shuffleQuestions: typeof data?.shuffleQuestions === "boolean" ? data.shuffleQuestions : DEFAULT_SETTINGS.shuffleQuestions,
    shuffleOptions: typeof data?.shuffleOptions === "boolean" ? data.shuffleOptions : DEFAULT_SETTINGS.shuffleOptions,
    instantFeedback: typeof data?.instantFeedback === "boolean" ? data.instantFeedback : DEFAULT_SETTINGS.instantFeedback,
  };
}

export function readDraft(): Draft {
  const data = record(readStored(DRAFT_KEY));
  return {
    subject: typeof data?.subject === "string" ? data.subject : "",
    raw: typeof data?.raw === "string" ? data.raw : typeof data?.json === "string" ? data.json : "",
    format: data?.format === "html" ? "html" : "json",
    settings: readSettings(data?.settings),
    cloudId: typeof data?.cloudId === "string" ? data.cloudId : undefined,
    cloudRevision: typeof data?.cloudRevision === "number" && Number.isInteger(data.cloudRevision) && data.cloudRevision > 0 ? data.cloudRevision : undefined,
  };
}

export function readLibrary(): SavedQuiz[] {
  const data = readStored(LIBRARY_KEY);
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry) => {
    const quiz = record(entry);
    if (!quiz || typeof quiz.id !== "string" || typeof quiz.title !== "string" || typeof quiz.updatedAt !== "string") return [];
    const parsed = parseQuiz(JSON.stringify(quiz.questions), "json");
    return parsed.ok && !parsed.warnings.length ? [{ id: quiz.id, title: quiz.title, updatedAt: quiz.updatedAt, questions: parsed.questions }] : [];
  });
}

export function readStage(): Stage {
  const data = record(readStored(SESSION_KEY));
  const session = record(data?.session);
  if (!session || !["quiz", "results"].includes(String(data?.name)) || typeof session.subject !== "string") return { name: "setup" };
  const run = parseQuiz(JSON.stringify(session.run), "json");
  const source = parseQuiz(JSON.stringify(session.source), "json");
  if (!run.ok || !source.ok || run.warnings.length || source.warnings.length) return { name: "setup" };
  const progress = record(data?.name === "results" ? data : session.progress);
  const rawAnswers = record(progress?.answers);
  const answers: Record<string, string> = Object.create(null);
  for (const question of run.questions) {
    const answer = rawAnswers?.[question.id];
    if (typeof answer === "string" && question.options.some((option) => option.key === answer)) answers[question.id] = answer;
  }
  const elapsedMs = typeof progress?.elapsedMs === "number" && Number.isFinite(progress.elapsedMs) ? Math.max(0, progress.elapsedMs) : 0;
  const index = typeof progress?.index === "number" && Number.isInteger(progress.index) ? Math.max(0, Math.min(run.questions.length - 1, progress.index)) : 0;
  const restored = {
    runId: typeof session.runId === "string" && /^[0-9a-f-]{36}$/i.test(session.runId) ? session.runId : crypto.randomUUID(),
    quizId: typeof session.quizId === "string" && /^[0-9a-f-]{36}$/i.test(session.quizId) ? session.quizId : undefined,
    subject: session.subject, source: source.questions, run: run.questions,
    settings: readSettings(session.settings),
    attempt: typeof session.attempt === "number" ? session.attempt : 0,
    progress: { index, answers, elapsedMs },
  };
  return data?.name === "results" ? { name: "results", session: restored, answers, elapsedMs } : { name: "quiz", session: restored };
}
