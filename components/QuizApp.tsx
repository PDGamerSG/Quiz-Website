"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/quiz";
import { buildRun, type Answers, type Progress, type QuizSettings, type Session, type Stage } from "@/lib/session";
import { readStage, SESSION_KEY, writeStored } from "@/lib/storage";
import { QuizScreen } from "./QuizScreen";
import { ResultsScreen } from "./ResultsScreen";
import { SetupScreen } from "./SetupScreen";
import { ConfirmDialog } from "./ConfirmDialog";

function LoadedQuizApp() {
  const [stage, setStage] = useState<Stage>(readStage);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const stageRef = useRef(stage);

  useEffect(() => {
    stageRef.current = stage;
    const saved = writeStored(SESSION_KEY, stage.name === "setup" ? null : stage);
    const timer = setTimeout(() => setStorageFailed(!saved), 0);
    return () => clearTimeout(timer);
  }, [stage]);

  const start = useCallback(({ subject, questions, settings }: { subject: string; questions: Question[]; settings: QuizSettings }) => {
    setStage({ name: "quiz", session: { subject, source: questions, settings, run: buildRun(questions, settings), attempt: 0 } });
    window.scrollTo({ top: 0 });
  }, []);

  const saveProgress = useCallback((progress: Progress) => {
    const current = stageRef.current;
    if (current.name === "quiz") {
      const next: Stage = { ...current, session: { ...current.session, progress } };
      stageRef.current = next;
      // Persist synchronously as pagehide cannot wait for a React effect.
      writeStored(SESSION_KEY, next);
    }
    setStage((current) => current.name === "quiz" ? { ...current, session: { ...current.session, progress } } : current);
  }, []);

  const finish = useCallback(({ answers, elapsedMs }: { answers: Answers; elapsedMs: number }) => {
    setStage((current) => current.name === "quiz" ? { name: "results", session: current.session, answers, elapsedMs } : current);
    window.scrollTo({ top: 0 });
  }, []);

  const retry = useCallback((session: Session, questions?: Question[]) => {
    const source = questions ?? session.source;
    setStage({ name: "quiz", session: { ...session, source, run: buildRun(source, session.settings), attempt: session.attempt + 1, progress: undefined } });
    window.scrollTo({ top: 0 });
  }, []);

  function newQuiz() {
    setStage({ name: "setup" });
    window.scrollTo({ top: 0 });
  }

  if (stage.name === "setup") return <SetupScreen onStart={start} />;
  if (stage.name === "results") return <ResultsScreen subject={stage.session.subject} questions={stage.session.run}
    answers={stage.answers} elapsedMs={stage.elapsedMs} onRetry={() => retry(stage.session)}
    onRetryMissed={() => retry(stage.session, stage.session.run.filter((question) => stage.answers[question.id] !== question.correctKey))}
    onNewQuiz={newQuiz} />;

  return <>
    <QuizScreen key={stage.session.attempt} subject={stage.session.subject} questions={stage.session.run}
      initialProgress={stage.session.progress} instantFeedback={stage.session.settings.instantFeedback}
      shortcutsEnabled={!confirmingQuit} onProgress={saveProgress} onFinish={finish} onQuit={() => setConfirmingQuit(true)} />
    {storageFailed && <p role="alert" className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-lg border border-danger/40 bg-card p-3 text-xs text-danger">Browser storage is unavailable. This attempt will not survive a reload.</p>}
    {confirmingQuit && <ConfirmDialog title="leave this quiz?" confirmLabel="leave quiz" onCancel={() => setConfirmingQuit(false)}
      onConfirm={() => { setConfirmingQuit(false); newQuiz(); }}>Your current attempt will be discarded. Your questions remain in the draft and quiz library.</ConfirmDialog>}
  </>;
}

export function QuizApp() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timer);
  }, []);
  return ready ? <LoadedQuizApp /> : <main className="flex min-h-screen items-center justify-center bg-background text-foreground" aria-busy="true"><p role="status" className="text-sm text-muted-foreground">loading your quizzes…</p></main>;
}
