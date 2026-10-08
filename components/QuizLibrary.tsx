"use client";

import { BookOpen, Download, RefreshCw, Trash2 } from "lucide-react";
import type { QuizSummary } from "@/lib/cloud-types";
import { Button } from "./ui";

export function QuizLibrary({ quizzes, loading, error, busy, shared, onRefresh, onLoad, onExport, onDelete }: {
  quizzes: QuizSummary[]; loading: boolean; error: string; busy: boolean; shared: boolean;
  onRefresh: () => void; onLoad: (quiz: QuizSummary) => void; onExport: (quiz: QuizSummary) => void; onDelete: (quiz: QuizSummary) => void;
}) {
  return (
    <section aria-labelledby="library-heading" className="mt-10" aria-busy={loading}>
      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /><h2 id="library-heading" className="text-sm font-medium">{shared ? "shared quiz library" : "your quiz library"}</h2><span className="text-xs text-muted-foreground">{quizzes.length}</span><Button type="button" variant="ghost" className="ml-auto h-10 px-3 text-xs" disabled={loading || busy} onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" />refresh</Button></div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{shared ? "Saved in the cloud for everyone. Visitors can open, edit and delete these quizzes." : "Saved in the cloud for this browser."}</p>
      {loading && <p role="status" className="mt-3 text-xs text-muted-foreground">loading saved quizzes…</p>}
      {error && <p role="alert" className="mt-3 text-xs text-danger">{error} Use refresh to retry.</p>}
      {!loading && !error && !quizzes.length && <p className="mt-3 text-xs text-muted-foreground">Save your first quiz to add it to the library.</p>}
      {quizzes.length > 0 && <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">{quizzes.map((quiz) => <li key={quiz.id} className="flex items-center gap-3 py-4">
          <button type="button" disabled={busy} onClick={() => onLoad(quiz)} className="min-w-0 flex-1 text-left disabled:opacity-50"><span className="block truncate text-sm hover:text-accent">{quiz.title}</span><span className="mt-1 block text-xs text-muted-foreground">{quiz.questionCount} questions · open quiz</span></button>
          <Button type="button" variant="ghost" disabled={busy} className="h-10 w-10 shrink-0 px-0" aria-label={`Export ${quiz.title}`} onClick={() => onExport(quiz)}><Download className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" disabled={busy} className="h-10 w-10 shrink-0 px-0" aria-label={`Delete ${quiz.title}`} onClick={() => onDelete(quiz)}><Trash2 className="h-4 w-4" /></Button>
        </li>)}</ul>}
    </section>
  );
}
