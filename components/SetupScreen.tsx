"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, RotateCcw, Save, Shuffle, Sparkles, Zap } from "lucide-react";
import { parseQuiz, serializeQuiz, type ImportFormat, type Question } from "@/lib/quiz";
import { downloadJson } from "@/lib/download";
import { DRAFT_KEY, LIBRARY_KEY, readDraft, readLibrary, writeStored, type SavedQuiz } from "@/lib/storage";
import { type QuizSettings } from "@/lib/session";
import { cn } from "@/lib/utils";
import { QuizImport } from "./QuizImport";
import { QuizLibrary } from "./QuizLibrary";
import { ConfirmDialog } from "./ConfirmDialog";
import { QuestionExplanationEditor } from "./QuestionExplanationEditor";
import { QuizFormatGuide } from "./QuizFormatGuide";
import { Backdrop, Badge, Button, Card } from "./ui";

const TOGGLES = [
  { id: "shuffleQuestions", label: "shuffle questions", hint: "a fresh order each run", icon: Shuffle },
  { id: "shuffleOptions", label: "shuffle options", hint: "mix up the answer order", icon: RotateCcw },
  { id: "instantFeedback", label: "instant feedback", hint: "see answers as you go", icon: Zap },
] as const;

export function SetupScreen({ onStart }: {
  onStart: (payload: { subject: string; questions: Question[]; settings: QuizSettings }) => void;
}) {
  const [draft, setDraft] = useState(readDraft);
  const [library, setLibrary] = useState(readLibrary);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [deleting, setDeleting] = useState<SavedQuiz | null>(null);
  const [importRevision, setImportRevision] = useState(0);
  const parsed = useMemo(() => draft.raw.trim() ? parseQuiz(draft.raw, draft.format) : null, [draft.raw, draft.format]);
  const canStart = Boolean(draft.subject.trim() && parsed?.ok);
  const topics = useMemo(() => parsed?.ok ? Array.from(new Set(parsed.questions.flatMap((question) => question.topic ? [question.topic] : []))) : [], [parsed]);
  const [topic, setTopic] = useState("");
  const selected = parsed?.ok ? parsed.questions.filter((question) => !topic || question.topic === topic) : [];

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = writeStored(DRAFT_KEY, draft);
      setStorageError(saved ? "" : "Browser storage is unavailable or full. You can still take a quiz and download a JSON backup.");
    }, 400);
    return () => clearTimeout(timer);
  }, [draft]);

  function changeImport(raw: string, format: ImportFormat, title?: string) {
    setDraft((previous) => ({ ...previous, raw, format, subject: title ?? previous.subject }));
    setTopic("");
    setImportRevision((revision) => revision + 1);
    setMessage("");
  }

  function saveQuiz() {
    if (!parsed?.ok || !draft.subject.trim()) return;
    const title = draft.subject.trim();
    const existing = library.find((quiz) => quiz.title.toLowerCase() === title.toLowerCase());
    const quiz = { id: existing?.id ?? crypto.randomUUID(), title, questions: parsed.questions, updatedAt: new Date().toISOString() };
    const next = [quiz, ...library.filter((item) => item.id !== quiz.id)];
    if (writeStored(LIBRARY_KEY, next)) {
      setLibrary(next);
      setMessage(existing ? "Quiz updated in your library." : "Quiz saved to your library.");
    } else setStorageError("Couldn't save this quiz. Download a JSON backup or free up browser storage.");
  }

  function start() {
    if (!canStart || !selected.length) return;
    saveQuiz();
    writeStored(DRAFT_KEY, draft);
    onStart({ subject: topic ? `${draft.subject.trim()} · ${topic}` : draft.subject.trim(), questions: selected, settings: draft.settings });
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <Backdrop />
      <div className="relative mx-auto w-full max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <header className="flex flex-col items-center text-center anim-fade-up">
          <Badge icon={<Sparkles className="h-3 w-3 text-accent" />}>quizly · your questions, your pace</Badge>
          <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">bring your quiz.<br /><span className="text-accent">make it a little more yours.</span></h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Upload HTML or JSON, choose how you practise, and get a full answer review. Your quizzes stay on this device.</p>
        </header>
        <Card className="mt-8 p-5 anim-fade-up d-2 sm:p-7">
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

          {topics.length > 1 && <div className="mt-6"><label htmlFor="topic" className="text-sm font-medium">focus on a topic</label><select id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-card px-3 text-sm"><option value="">all topics · {parsed?.ok ? parsed.questions.length : 0} questions</option>{topics.map((item) => <option key={item} value={item}>{item}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">{selected.length} questions in this run</p></div>}

          <fieldset className="mt-7"><legend className="text-sm font-medium">make it your practice</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{TOGGLES.map(({ id, label, hint, icon: Icon }) => <button key={id} type="button" role="switch" aria-label={label} aria-checked={draft.settings[id]}
            onClick={() => setDraft((previous) => ({ ...previous, settings: { ...previous.settings, [id]: !previous.settings[id] } }))}
            className={cn("rounded-xl border p-4 text-left transition-colors", draft.settings[id] ? "border-accent/40 bg-accent/10" : "border-white/10 bg-white/5 hover:bg-white/10")}>
            <div className="flex items-center justify-between"><Icon className={cn("h-4 w-4", draft.settings[id] ? "text-accent" : "text-muted-foreground")} /><span className="text-[10px] text-muted-foreground">{draft.settings[id] ? "ON" : "OFF"}</span></div><span className="mt-3 block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{hint}</span></button>)}</div></fieldset>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" variant="glass" disabled={!canStart} onClick={saveQuiz} className="flex-1"><Save className="h-4 w-4" />save quiz</Button>
            <Button type="button" variant="glass" disabled={!canStart} onClick={() => { if (parsed?.ok) downloadJson(draft.subject, serializeQuiz(draft.subject.trim(), parsed.questions)); }} className="flex-1"><Download className="h-4 w-4" />export JSON</Button>
          </div>
          <p role="status" className="mt-3 min-h-4 text-xs text-success">{message}</p>
          {storageError && <p role="alert" className="mt-2 text-xs text-danger">{storageError}</p>}
          <Button type="button" disabled={!canStart || !selected.length} onClick={start} className="mt-3 w-full">start quiz{selected.length ? ` · ${selected.length} questions` : ""}<ArrowRight className="h-4 w-4" /></Button>
          {!draft.subject.trim() && parsed?.ok && <p className="mt-2 text-center text-xs text-muted-foreground">Give your quiz a name to start.</p>}
        </Card>
        <QuizFormatGuide />
        <QuizLibrary quizzes={library} onLoad={(quiz) => changeImport(serializeQuiz(quiz.title, quiz.questions), "json", quiz.title)} onDelete={setDeleting} />
        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">Drafts, saved quizzes and your current attempt are stored in this browser.<br />Export JSON to keep a backup or move a quiz to another device.</p>
      </div>
      {deleting && <ConfirmDialog title={`delete “${deleting.title}”?`} confirmLabel="delete quiz" onCancel={() => setDeleting(null)} onConfirm={() => {
        const next = library.filter((quiz) => quiz.id !== deleting.id);
        if (writeStored(LIBRARY_KEY, next)) { setLibrary(next); setMessage("Quiz removed from your library."); }
        else setStorageError("Couldn't update browser storage. Please try again.");
        setDeleting(null);
      }}>This removes the saved copy from this browser. Your current draft stays available.</ConfirmDialog>}
    </main>
  );
}
