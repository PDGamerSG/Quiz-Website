import type { Question } from "./quiz";
import { shuffle } from "./utils";

export type QuizSettings = {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  instantFeedback: boolean;
};

export const DEFAULT_SETTINGS: QuizSettings = {
  shuffleQuestions: false, shuffleOptions: false, instantFeedback: true,
};

export type Answers = Record<string, string | undefined>;
export type Progress = { index: number; answers: Answers; elapsedMs: number };
export type Session = {
  subject: string;
  source: Question[];
  settings: QuizSettings;
  run: Question[];
  attempt: number;
  progress?: Progress;
};
export type Stage =
  | { name: "setup" }
  | { name: "quiz"; session: Session }
  | { name: "results"; session: Session; answers: Answers; elapsedMs: number };

export function buildRun(source: Question[], settings: QuizSettings): Question[] {
  const ordered = settings.shuffleQuestions ? shuffle(source) : [...source];
  return settings.shuffleOptions
    ? ordered.map((question) => ({ ...question, options: shuffle(question.options) })) : ordered;
}

export function scoreQuiz(questions: Question[], answers: Answers) {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined) skipped++;
    else if (answer === question.correctKey) correct++;
    else wrong++;
  }
  return { correct, wrong, skipped, percent: questions.length ? Math.round(correct / questions.length * 100) : 0 };
}
