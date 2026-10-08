"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Minus, RotateCcw, Sparkles, Timer, Trophy, X } from "lucide-react";
import type { Question } from "@/lib/quiz";
import { cn, formatDuration } from "@/lib/utils";
import type { Answers } from "./QuizScreen";
import { scoreQuiz } from "@/lib/session";
import { downloadJson } from "@/lib/download";
import { Backdrop, Badge, Button, Card } from "./ui";

type Props = {
  subject: string;
  questions: Question[];
  answers: Answers;
  elapsedMs: number;
  onRetry: () => void;
  onRetryMissed: () => void;
  onNewQuiz: () => void;
};

type Filter = "all" | "correct" | "wrong" | "skipped";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "all" },
  { id: "correct", label: "correct" },
  { id: "wrong", label: "wrong" },
  { id: "skipped", label: "skipped" },
];

function verdict(percent: number) {
  if (percent === 100) return "a perfect run.";
  if (percent >= 80) return "strong work.";
  if (percent >= 60) return "solid, with room to grow.";
  if (percent >= 40) return "halfway there — go again.";
  return "worth another pass.";
}

export function ResultsScreen({
  subject,
  questions,
  answers,
  elapsedMs,
  onRetry,
  onRetryMissed,
  onNewQuiz,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);

  const stats = useMemo(() => scoreQuiz(questions, answers), [answers, questions]);

  const visible = useMemo(() => {
    return questions.filter((question) => {
      const answer = answers[question.id];
      if (filter === "correct") return answer === question.correctKey;
      if (filter === "wrong") return answer !== undefined && answer !== question.correctKey;
      if (filter === "skipped") return answer === undefined;
      return true;
    });
  }, [answers, filter, questions]);

  // Circumference of the r=52 score ring, used to drive the stroke dash.
  const ringLength = 2 * Math.PI * 52;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Backdrop />

      <div className="relative mx-auto w-full max-w-3xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        <header className="flex flex-col items-center text-center anim-fade-up">
          <Badge icon={<Trophy className="h-3 w-3 text-accent" />}>{subject}</Badge>

          <div className="relative mt-8 h-40 w-40">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/10"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringLength}
                strokeDashoffset={ringLength * (1 - stats.percent / 100)}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.45,0.05,0.55,0.95)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold tabular-nums tracking-tight">
                {stats.percent}%
              </span>
              <span className="mt-1 text-xs text-muted-foreground tabular-nums">
                {stats.correct} / {questions.length}
              </span>
            </div>
          </div>

          <h1 ref={headingRef} tabIndex={-1} className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
            {verdict(stats.percent)}
          </h1>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            finished in {formatDuration(elapsedMs)}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-3 gap-2 anim-fade-up d-2">
          {[
            { label: "correct", value: stats.correct, tone: "text-success" },
            { label: "wrong", value: stats.wrong, tone: "text-danger" },
            { label: "skipped", value: stats.skipped, tone: "text-muted-foreground" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 text-center sm:p-5">
              <p className={cn("text-2xl font-semibold tabular-nums", stat.tone)}>{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={onRetry} className="flex-1"><RotateCcw className="h-4 w-4" />retake quiz</Button>
          <Button type="button" variant="glass" onClick={onNewQuiz} className="flex-1">quiz library</Button>
          {stats.wrong + stats.skipped > 0 && <Button type="button" variant="glass" className="w-full" onClick={onRetryMissed}>practise missed questions · {stats.wrong + stats.skipped}</Button>}
          <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => downloadJson(`${subject}-results`, JSON.stringify({ subject, stats, elapsedMs, questions: questions.map((question) => ({ ...question, chosenKey: answers[question.id] ?? null, result: answers[question.id] === undefined ? "skipped" : answers[question.id] === question.correctKey ? "correct" : "wrong" })) }, null, 2))}><Download className="h-4 w-4" />download results</Button>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between anim-fade-up d-3">
          <h2 className="text-sm font-medium">review your answers</h2>
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={cn(
                  "h-8 flex-1 rounded-lg px-3 text-xs transition-all duration-300 sm:flex-none",
                  filter === item.id
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {visible.length === 0 && (
            <Card className="p-8 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-accent" />
              <p className="mt-3 text-sm text-muted-foreground">
                nothing here — you have no {filter} answers.
              </p>
            </Card>
          )}

          {visible.map((question) => {
            const answer = answers[question.id];
            const isCorrect = answer === question.correctKey;
            const number = questions.indexOf(question) + 1;

            return (
              <Card key={question.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs",
                      answer === undefined
                        ? "border-white/10 bg-white/5 text-muted-foreground"
                        : isCorrect
                          ? "border-success/50 bg-success/15 text-success"
                          : "border-danger/50 bg-danger/15 text-danger",
                    )}
                  >
                    {answer === undefined ? (
                      <Minus className="h-3.5 w-3.5" />
                    ) : isCorrect ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">question {number} · {answer === undefined ? "skipped" : isCorrect ? "correct" : "wrong"}{question.topic ? ` · ${question.topic}` : ""}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{question.prompt}</p>

                    <div className="mt-4 space-y-1.5">
                      {question.options.map((option) => {
                        const picked = answer === option.key;
                        const correct = option.key === question.correctKey;
                        if (!picked && !correct) return null;
                        return (
                          <p
                            key={option.key}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm leading-relaxed",
                              correct
                                ? "border-success/30 bg-success/10 text-success"
                                : "border-danger/30 bg-danger/10 text-danger",
                            )}
                          >
                            <span className="mr-2 text-xs opacity-70">
                              {correct ? "correct" : "you picked"} · {option.key}
                            </span>
                            {option.text}
                          </p>
                        );
                      })}
                      {answer === undefined && (
                        <p className="text-xs text-muted-foreground">you skipped this one.</p>
                      )}
                    </div>

                    {question.explanation && (
                      <div className="mt-3"><p className="text-xs font-medium text-foreground">explanation</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{question.explanation}</p></div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={onRetry} className="flex-1">
            <RotateCcw className="h-4 w-4" />
            retake this quiz
          </Button>
          <Button type="button" variant="glass" onClick={onNewQuiz} className="flex-1">
            new quiz
          </Button>
        </div>
      </div>
    </main>
  );
}
