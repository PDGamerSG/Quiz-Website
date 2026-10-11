"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Pencil, Save, Sparkles } from "lucide-react";
import { parseQuiz, sameQuestions, serializeQuiz, type ImportFormat, type Question } from "@/lib/quiz";
import { downloadJson } from "@/lib/download";
import { DRAFT_KEY, LIBRARY_KEY, readDraft, readLibrary, writeStored } from "@/lib/storage";
import { cloud, errorMessage } from "@/lib/cloud";
import type { CloudAttempt, CloudQuiz, QuizSummary } from "@/lib/cloud-types";
import { type QuizSettings } from "@/lib/session";
import { QuizImport } from "./QuizImport";
import { QuizLibrary } from "./QuizLibrary";
import { useQuizLibrary } from "./useQuizLibrary";
import { AttemptHistory } from "./AttemptHistory";
import { ConfirmDialog } from "./ConfirmDialog";
import { QuestionExplanationEditor } from "./QuestionExplanationEditor";
import { QuizFormatGuide } from "./QuizFormatGuide";
import { QuizPracticeSettings } from "./QuizPracticeSettings";
import { Backdrop, Badge, Button, Card } from "./ui";

export function SetupScreen({ onStart, onReview }: {
  onStart: (payload: { subject: string; questions: Question[]; settings: QuizSettings; quizId?: string }) => void;
  onReview: (attempt: CloudAttempt) => void;
}) {
  const [draft, setDraft] = useState(readDraft);
  const library = useQuizLibrary();
  const [deviceQuizzes, setDeviceQuizzes] = useState(readLibrary);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [cloudError, setCloudError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<QuizSummary | null>(null);
  const [importRevision, setImportRevision] = useState(0);
  const parsed = useMemo(() => draft.raw.trim() ? parseQuiz(draft.raw, draft.format) : null, [draft.raw, draft.format]);
  const canStart = Boolean(draft.subject.trim() && parsed?.ok);
  const readyToStart = draft.view === "start" && Boolean(draft.cloudId && parsed?.ok);
  const [topic, setTopic] = useState("");
  const selected = parsed?.ok ? parsed.questions.filter((question) => !topic || question.topic === topic) : [];

  useEffect(() => {
    if (!readyToStart) return;
    const heading = document.getElementById("quiz-start-heading");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  }, [readyToStart, draft.cloudId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = writeStored(DRAFT_KEY, draft);
      setStorageError(saved ? "" : "Browser storage is unavailable or full. You can still take a quiz and download a JSON backup.");
    }, 400);
    return () => clearTimeout(timer);
  }, [draft]);

  function changeImport(raw: string, format: ImportFormat, title?: string) {
    setDraft((previous) => ({ ...previous, raw, format, view: "edit", subject: title ?? previous.subject,
      ...(title !== undefined || !raw ? { cloudId: undefined, cloudRevision: undefined } : {}) }));
    setTopic("");
    setImportRevision((revision) => revision + 1);
    setMessage("");
    setCloudError("");
  }

  async function persistQuiz(): Promise<CloudQuiz> {
    if (!parsed?.ok) throw new Error("Import valid questions first.");
    const result = await cloud.saveQuiz({ title: draft.subject.trim(), questions: parsed.questions,
      id: draft.cloudId, revision: draft.cloudRevision });
    library.remember(result.quiz);
    if (result.created === false && !sameQuestions(result.quiz.questions, parsed.questions)) {
      throw new Error("A quiz with this name already exists. Choose another name, or open the saved quiz to edit it. Your imported questions are still in the draft.");
    }
    const next = { ...draft, subject: result.quiz.title, raw: serializeQuiz(result.quiz.title, result.quiz.questions), format: "json" as const,
      cloudId: result.quiz.id, cloudRevision: result.quiz.revision, view: "start" as const };
    setDraft(next); writeStored(DRAFT_KEY, next);
    setMessage(draft.cloudId ? "Quiz updated in the cloud." : "Quiz saved in the cloud.");
    return result.quiz;
  }

  async function saveQuiz(startAfter = false) {
    if (!canStart || busy) return;
    setBusy(true); setCloudError(""); setMessage("");
    try {
      const quiz = await persistQuiz();
      if (startAfter) start(quiz.id);
    } catch (error) { setCloudError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  function start(quizId?: string) {
    if (!canStart || !selected.length) return;
    if (!quizId) writeStored(DRAFT_KEY, draft);
    onStart({ subject: topic ? `${draft.subject.trim()} · ${topic}` : draft.subject.trim(), questions: selected, settings: draft.settings, quizId });
  }

  function editQuiz() {
    const next = { ...draft, view: "edit" as const };
    setDraft(next); writeStored(DRAFT_KEY, next);
    requestAnimationFrame(() => document.getElementById("subject")?.focus());
  }

  function importQuiz() {
    if (readyToStart) {
      const next = { ...draft, subject: "", raw: "", cloudId: undefined, cloudRevision: undefined, view: "edit" as const };
      setDraft(next); writeStored(DRAFT_KEY, next);
      setTopic(""); setImportRevision((revision) => revision + 1); setMessage(""); setCloudError("");
    }
    requestAnimationFrame(() => document.getElementById("subject")?.focus());
  }

  async function loadQuiz(summary: QuizSummary, exporting = false) {
    setBusy(true); setCloudError("");
    try {
      const { quiz } = await cloud.getQuiz(summary.id);
      library.remember(quiz);
      if (exporting) downloadJson(quiz.title, serializeQuiz(quiz.title, quiz.questions));
      else {
        const next = { ...draft, subject: quiz.title, raw: serializeQuiz(quiz.title, quiz.questions), format: "json" as const,
          cloudId: quiz.id, cloudRevision: quiz.revision, view: "start" as const };
        setDraft(next); writeStored(DRAFT_KEY, next);
        setTopic(""); setImportRevision((revision) => revision + 1); setMessage("");
      }
    } catch (error) { setCloudError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function deleteQuiz(quiz: QuizSummary) {
    setDeleting(null); setBusy(true); setCloudError("");
    try {
      await cloud.deleteQuiz(quiz); library.remove(quiz.id);
      if (draft.cloudId === quiz.id) setDraft((previous) => ({ ...previous, cloudId: undefined, cloudRevision: undefined, view: "edit" }));
      setMessage("Quiz removed from the cloud library.");
    } catch (error) { setCloudError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function publishDeviceQuizzes() {
    setBusy(true); setCloudError("");
    let remaining = [...deviceQuizzes];
    try {
      for (const saved of deviceQuizzes) {
        const result = await cloud.saveQuiz({ title: saved.title, questions: saved.questions });
        library.remember(result.quiz);
        if (result.created === false && !sameQuestions(result.quiz.questions, saved.questions)) continue;
        remaining = remaining.filter((item) => item.id !== saved.id);
        writeStored(LIBRARY_KEY, remaining);
        setDeviceQuizzes(remaining);
      }
      setMessage(remaining.length ? "Some device quizzes have names already used in the cloud. Open a device copy below, give it a new name and save it." : "Your device quizzes are now saved in the cloud.");
    } catch (error) { setCloudError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Backdrop />
      <div className="relative mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <header className="flex flex-col items-center text-center anim-fade-up">
          <Badge icon={<Sparkles className="h-3 w-3 text-accent" />}>quizly · your questions, your pace</Badge>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">bring your quiz.<br /><span className="text-accent">make it a little more yours.</span></h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Choose from the available quizzes below, or upload your own HTML or JSON. Practise at your pace and review every answer.</p>
        </header>
        <QuizLibrary quizzes={library.quizzes} loading={library.loading} error={library.error} busy={busy} shared={library.visibility === "shared"}
          onRefresh={() => void library.refresh()} onLoad={(quiz) => void loadQuiz(quiz)} onExport={(quiz) => void loadQuiz(quiz, true)} onDelete={setDeleting} onImport={importQuiz} />
        <div id="quiz-editor" className="scroll-mt-6">
        {readyToStart && parsed?.ok ? <Card className="mt-8 p-5 anim-fade-up sm:p-7">
          <fieldset disabled={busy} className="min-w-0" aria-busy={busy}>
            <p className="text-xs font-medium text-accent">ready to practise</p>
            <h2 id="quiz-start-heading" tabIndex={-1} className="mt-2 scroll-mt-6 break-words text-xl font-semibold tracking-tight sm:text-2xl">{draft.subject}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{parsed.questions.length} questions · choose your settings, then start.</p>
            <QuizPracticeSettings questions={parsed.questions} settings={draft.settings} topic={topic} onTopicChange={setTopic}
              onChange={(settings) => setDraft((previous) => ({ ...previous, settings }))} />
            {message && <p role="status" className="mt-4 text-xs text-success">{message}</p>}
            {storageError && <p role="alert" className="mt-3 text-xs text-danger">{storageError}</p>}
            {cloudError && <p role="alert" className="mt-3 text-xs text-danger">{cloudError}</p>}
            <Button type="button" disabled={!canStart || !selected.length} className="mt-6 w-full" onClick={() => {
              writeStored(DRAFT_KEY, draft);
              start(draft.cloudId);
            }}>start quiz · {selected.length} questions<ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={editQuiz}><Pencil aria-hidden="true" className="h-4 w-4" />edit quiz</Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={importQuiz}>import another quiz</Button>
            </div>
          </fieldset>
        </Card> : <>
        <Card className="mt-8 p-5 anim-fade-up d-2 sm:p-7">
          <fieldset disabled={busy} className="min-w-0" aria-busy={busy}>
          <h2 className="mb-5 text-base font-medium">import or edit a quiz</h2>
          <label htmlFor="subject" className="text-sm font-medium">quiz name</label>
          <input id="subject" value={draft.subject} maxLength={180} placeholder="e.g. software testing" autoComplete="off"
            onChange={(event) => setDraft((previous) => ({ ...previous, subject: event.target.value }))}
            className="mt-3 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-base placeholder:text-muted-foreground/60 hover:border-white/20" />
          <QuizImport raw={draft.raw} format={draft.format} parsed={parsed} onChange={changeImport} />

          {parsed?.ok && <QuestionExplanationEditor key={importRevision} questions={parsed.questions} onSave={(id, explanation) => {
            const questions = parsed.questions.map((question) => question.id === id ? { ...question, explanation: explanation || undefined } : question);
            setDraft((previous) => ({ ...previous, raw: serializeQuiz(previous.subject, questions), format: "json" }));
            setMessage("Explanation updated. Save your quiz to keep it in the library.");
          }} />}

          <QuizPracticeSettings questions={parsed?.ok ? parsed.questions : []} settings={draft.settings} topic={topic} onTopicChange={setTopic}
            onChange={(settings) => setDraft((previous) => ({ ...previous, settings }))} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" variant="glass" disabled={!canStart} onClick={() => void saveQuiz()} className="flex-1"><Save className="h-4 w-4" />save quiz</Button>
            <Button type="button" variant="glass" disabled={!canStart} onClick={() => { if (parsed?.ok) downloadJson(draft.subject, serializeQuiz(draft.subject.trim(), parsed.questions)); }} className="flex-1"><Download className="h-4 w-4" />export JSON</Button>
          </div>
          <p role="status" className="mt-3 min-h-4 text-xs text-success">{message}</p>
          {storageError && <p role="alert" className="mt-2 text-xs text-danger">{storageError}</p>}
          {cloudError && <p role="alert" className="mt-2 text-xs text-danger">{cloudError}</p>}
          <Button type="button" disabled={!canStart || !selected.length} onClick={() => void saveQuiz(true)} className="mt-3 w-full">{busy ? "connecting to quiz storage…" : `start quiz${selected.length ? ` · ${selected.length} questions` : ""}`}<ArrowRight className="h-4 w-4" /></Button>
          {cloudError && canStart && <Button type="button" variant="ghost" className="mt-2 w-full text-xs" onClick={() => start()}>start with this draft without saving</Button>}
          {!draft.subject.trim() && parsed?.ok && <p className="mt-2 text-center text-xs text-muted-foreground">Give your quiz a name to start.</p>}
          <p className="mt-3 text-center text-xs text-muted-foreground">{library.visibility === "shared" ? "Saving or starting publishes these questions to the shared library." : "Saving or starting keeps these questions in your cloud library."}</p>
          </fieldset>
        </Card>
        <QuizFormatGuide />
        </>}
        </div>
        {deviceQuizzes.length > 0 && <section aria-label="Quizzes saved on this device" className="mt-6 rounded-xl border border-white/10 p-4"><p className="text-sm">{deviceQuizzes.length} quizzes from this device</p><p className="mt-2 text-xs text-muted-foreground">Publish your previous saved quizzes to the cloud library. Copies with conflicting names stay here until you rename them.</p><Button type="button" variant="glass" disabled={busy} className="mt-3 text-xs" onClick={() => void publishDeviceQuizzes()}>publish device quizzes</Button><ul className="mt-3 space-y-2">{deviceQuizzes.map((quiz) => <li key={quiz.id}><button type="button" disabled={busy} className="text-left text-xs text-accent hover:underline" onClick={() => changeImport(serializeQuiz(quiz.title, quiz.questions), "json", quiz.title)}>open device copy · {quiz.title}</button></li>)}</ul></section>}
        <AttemptHistory onReview={onReview} disabled={busy} />
        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">Saved quizzes live in the cloud. Drafts and unfinished attempts recover on this device.<br />Completed results are saved in this browser&apos;s private cloud history.</p>
      </div>
      {deleting && <ConfirmDialog title={`delete “${deleting.title}”?`} confirmLabel="delete quiz" onCancel={() => setDeleting(null)} onConfirm={() => void deleteQuiz(deleting)}>This removes the quiz from {library.visibility === "shared" ? "everyone's shared library" : "your cloud library"}. Your draft and completed result history stay available.</ConfirmDialog>}
    </main>
  );
}
