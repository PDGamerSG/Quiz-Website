"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flag, Timer, X } from "lucide-react";
import type { Question } from "@/lib/quiz";
import type { Answers, Progress } from "@/lib/session";
import { cn, formatDuration } from "@/lib/utils";
import { Backdrop, Button, Card } from "./ui";
import { ConfirmDialog } from "./ConfirmDialog";

export type { Answers } from "@/lib/session";

type Props = {
  subject: string;
  questions: Question[];
  instantFeedback: boolean;
  initialProgress?: Progress;
  shortcutsEnabled: boolean;
  onProgress: (progress: Progress) => void;
  onFinish: (result: { answers: Answers; elapsedMs: number }) => void;
  onQuit: () => void;
};

export function QuizScreen({ subject, questions, instantFeedback, initialProgress, shortcutsEnabled, onProgress, onFinish, onQuit }: Props) {
  const [index, setIndex] = useState(initialProgress?.index ?? 0);
  const [answers, setAnswers] = useState<Answers>(initialProgress?.answers ?? Object.create(null));
  const [elapsedMs, setElapsedMs] = useState(initialProgress?.elapsedMs ?? 0);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState<{ index: number; key: string } | null>(null);
  const [baseElapsed] = useState(initialProgress?.elapsedMs ?? 0);
  const startedAt = useRef(0);
  const progressRef = useRef<Progress>({ index, answers, elapsedMs });
  const questionRef = useRef<HTMLHeadingElement>(null);

  const question = questions[index];
  const chosen = answers[question.id];
  const locked = instantFeedback && chosen !== undefined;
  const answeredCount = questions.filter((item) => answers[item.id] !== undefined).length;
  const isLast = index === questions.length - 1;

  useEffect(() => {
    startedAt.current = Date.now();
    const save = () => {
      const elapsedMs = baseElapsed + Date.now() - startedAt.current;
      setElapsedMs(elapsedMs);
      onProgress({ ...progressRef.current, elapsedMs });
    };
    const timer = setInterval(save, 1000);
    window.addEventListener("pagehide", save);
    return () => { clearInterval(timer); window.removeEventListener("pagehide", save); };
  }, [baseElapsed, onProgress]);

  useEffect(() => {
    const progress = { index, answers, elapsedMs: baseElapsed + Date.now() - startedAt.current };
    progressRef.current = progress;
    onProgress(progress);
  }, [index, answers, baseElapsed, onProgress]);

  useEffect(() => { questionRef.current?.focus({ preventScroll: true }); }, [index]);

  const finish = useCallback(() => {
    setConfirmingFinish(false);
    onFinish({ answers, elapsedMs: baseElapsed + Date.now() - startedAt.current });
  }, [answers, baseElapsed, onFinish]);

  const requestFinish = useCallback(() => {
    setPendingAdvance(null);
    if (answeredCount < questions.length) setConfirmingFinish(true);
    else finish();
  }, [answeredCount, questions.length, finish]);

  const select = useCallback(
    (key: string) => {
      if (!shortcutsEnabled || confirmingFinish || (instantFeedback && chosen !== undefined) || chosen === key) return;
      setAnswers((prev) => {
        // Once instant feedback has revealed the answer, the pick is final.
        if (instantFeedback && prev[question.id] !== undefined) return prev;
        return { ...prev, [question.id]: key };
      });
      setPendingAdvance({ index, key });
    },
    [instantFeedback, question.id, chosen, index, shortcutsEnabled, confirmingFinish],
  );

  const goNext = useCallback(() => {
    setPendingAdvance(null);
    if (isLast) requestFinish();
    else setIndex((i) => i + 1);
  }, [requestFinish, isLast]);

  const goPrev = useCallback(() => {
    setPendingAdvance(null);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Schedule only a new answer selection. Restoring or reviewing an answered
  // question must never move the user away from it automatically.
  useEffect(() => {
    if (pendingAdvance?.index !== index || pendingAdvance.key !== chosen || !shortcutsEnabled || confirmingFinish) return;
    const timer = setTimeout(goNext, 2000);
    return () => clearTimeout(timer);
  }, [pendingAdvance, index, chosen, shortcutsEnabled, confirmingFinish, goNext]);

  // Keyboard: a–z or 1–9 pick an option, arrows and enter move between questions.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!shortcutsEnabled || confirmingFinish || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, summary, [contenteditable="true"], dialog')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
        return;
      }

      const byLetter = question.options.find(
        (option) => option.key.toLowerCase() === event.key.toLowerCase(),
      );
      if (byLetter) {
        event.preventDefault();
        select(byLetter.key);
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option) {
          event.preventDefault();
          select(option.key);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, question.options, select, shortcutsEnabled, confirmingFinish]);

  const progress = answeredCount / questions.length * 100;

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Backdrop />

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-28 pt-6 sm:px-8 sm:pb-12 sm:pt-10">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{subject}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              question {index + 1} of {questions.length} · {answeredCount} answered
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs tabular-nums text-muted-foreground backdrop-blur-md">
              <Timer className="h-3.5 w-3.5" />
              {formatDuration(elapsedMs)}
            </span>
            <Button
              type="button"
              variant="glass"
              className="h-9 w-9 px-0"
              onClick={() => { setPendingAdvance(null); onQuit(); }}
              aria-label="leave quiz"
              title="leave quiz"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div
          className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="questions answered"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.45,0.05,0.55,0.95)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card key={question.id} className="mt-8 p-5 anim-fade-up sm:p-8">
          {question.topic && <p className="mb-3 text-xs text-accent">{question.topic}</p>}
          <h1 ref={questionRef} tabIndex={-1} className="whitespace-pre-wrap break-words text-lg font-medium leading-relaxed sm:text-xl sm:leading-relaxed">
            {question.prompt}
          </h1>

          <div className="mt-6 grid gap-2.5">
            {question.options.map((option) => {
              const isChosen = chosen === option.key;
              const isCorrect = option.key === question.correctKey;
              const reveal = locked && (isChosen || isCorrect);

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => select(option.key)}
                  aria-pressed={isChosen}
                  aria-disabled={locked}
                  className={cn(
                    "group flex w-full items-start gap-3.5 rounded-xl border p-4 text-left",
                    "transition-all duration-300 ease-[cubic-bezier(0.45,0.05,0.55,0.95)]",
                    !reveal &&
                      (isChosen
                        ? "border-accent/50 bg-accent/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"),
                    reveal && isCorrect && "border-success/50 bg-success/10",
                    reveal && !isCorrect && "border-danger/50 bg-danger/10",
                    locked && !reveal && "opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-medium",
                      "transition-colors duration-300",
                      !reveal &&
                        (isChosen
                          ? "border-accent/50 bg-accent/20 text-accent"
                          : "border-white/10 bg-white/5 text-muted-foreground group-hover:text-foreground"),
                      reveal && isCorrect && "border-success/50 bg-success/20 text-success",
                      reveal && !isCorrect && "border-danger/50 bg-danger/20 text-danger",
                    )}
                  >
                    {reveal ? (
                      isCorrect ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )
                    ) : (
                      option.key
                    )}
                  </span>
                  <span className="whitespace-pre-wrap break-words pt-0.5 text-sm leading-relaxed sm:text-[15px]">
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {locked && <div role="status" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed anim-fade-up">
            <p className={chosen === question.correctKey ? "text-success" : "text-danger"}>{chosen === question.correctKey ? "Correct." : `Incorrect. The correct answer is ${question.correctKey}.`} Your first answer is recorded.</p>
            {question.explanation && <div className="mt-3"><p className="text-xs font-medium text-foreground">why this answer?</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{question.explanation}</p></div>}
          </div>}
          {pendingAdvance?.index === index && <p role="status" className="mt-3 text-xs text-muted-foreground">{isLast ? "Finishing this attempt in 2 seconds…" : "Next question in 2 seconds…"}</p>}
          {question.source && <p className="mt-4 text-xs text-muted-foreground">{question.source}</p>}
        </Card>

        <nav aria-label="question navigation" className="mt-6 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto py-1">
          {questions.map((item, itemIndex) => {
            const done = answers[item.id] !== undefined;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setPendingAdvance(null); setIndex(itemIndex); }}
                aria-label={`go to question ${itemIndex + 1}, ${done ? "answered" : "unanswered"}`}
                aria-current={itemIndex === index ? "step" : undefined}
                className={cn(
                  "h-9 min-w-9 rounded-lg border border-white/10 px-2 text-xs tabular-nums transition-colors",
                  itemIndex === index
                    ? "bg-accent text-background"
                    : done
                      ? "bg-white/35 hover:bg-white/50"
                      : "bg-white/10 hover:bg-white/25",
                )}
              >{itemIndex + 1}</button>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="glass"
              onClick={goPrev}
              disabled={index === 0}
              className="w-11 shrink-0 px-0 sm:w-auto sm:px-5"
              aria-label="previous question"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">back</span>
            </Button>
            <Button type="button" onClick={goNext} className="group flex-1">
              {isLast ? (
                <>
                  <Flag className="h-4 w-4" />
                  finish quiz
                </>
              ) : (
                <>
                  next question
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </div>
          {!isLast && <Button type="button" variant="ghost" onClick={requestFinish} className="mt-2 w-full text-xs">finish this attempt</Button>}
          <p className="mt-3 hidden text-center text-xs text-muted-foreground sm:block">
            press {question.options.map((o) => o.key.toLowerCase()).join(" / ")} to answer,
            enter for the next question
          </p>
        </div>
      </div>
      {confirmingFinish && <ConfirmDialog title="finish with unanswered questions?" confirmLabel="finish quiz" onConfirm={finish}
        onCancel={() => { setConfirmingFinish(false); const unanswered = questions.findIndex((item) => answers[item.id] === undefined); if (unanswered >= 0) setIndex(unanswered); }}>
        {questions.length - answeredCount} question{questions.length - answeredCount === 1 ? " is" : "s are"} unanswered and will count as skipped. Keep going to return to the first unanswered question.
      </ConfirmDialog>}
    </main>
  );
}
