import type { Question } from "./quiz";
import type { Answers, QuizSettings } from "./session";

export type CloudQuiz = {
  id: string; title: string; questions: Question[];
  questionCount: number; revision: number; createdAt: string; updatedAt: string;
};
export type QuizSummary = Omit<CloudQuiz, "questions">;
export type AttemptSummary = {
  id: string; subject: string; quizId: string | null; questionCount: number;
  correct: number; wrong: number; skipped: number; elapsedMs: number; completedAt: string;
};
export type CloudAttempt = AttemptSummary & { questions: Question[]; answers: Answers; settings: QuizSettings };
export type SaveQuizInput = { title: string; questions: Question[]; id?: string; revision?: number };
export type SaveAttemptInput = {
  id: string; quizId?: string; subject: string; questions: Question[];
  answers: Answers; elapsedMs: number; settings: QuizSettings;
};
