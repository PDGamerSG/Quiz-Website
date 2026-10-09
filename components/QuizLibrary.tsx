"use client";

import { useState } from "react";
import { ArrowRight, BookOpen, Download, RefreshCw, Search, Trash2 } from "lucide-react";
import type { QuizSummary } from "@/lib/cloud-types";
import { Button } from "./ui";

export function QuizLibrary({ quizzes, loading, error, busy, shared, onRefresh, onLoad, onExport, onDelete }: {
  quizzes: QuizSummary[]; loading: boolean; error: string; busy: boolean; shared: boolean;
  onRefresh: () => void; onLoad: (quiz: QuizSummary) => void; onExport: (quiz: QuizSummary) => void; onDelete: (quiz: QuizSummary) => void;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const visibleQuizzes = quizzes.filter((quiz) => quiz.title.toLocaleLowerCase().includes(query));
  return (
    <section aria-labelledby="library-heading" className="mt-10" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /><h2 id="library-heading" className="text-base font-medium">{shared ? "available quizzes" : "your quiz library"}</h2><span className="text-xs text-muted-foreground">{quizzes.length} {quizzes.length === 1 ? "quiz" : "quizzes"}</span><Button type="button" variant="ghost" className="ml-auto h-10 px-3 text-xs" disabled={loading || busy} onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" />refresh</Button></div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Choose a quiz to open its questions and start practising. {shared ? "This library is shared with everyone." : "These quizzes are saved for this browser."}</p>
      {quizzes.length > 0 && <div className="mt-4"><label htmlFor="quiz-search" className="sr-only">search available quizzes</label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input id="quiz-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search quizzes by name" autoComplete="off" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 text-sm placeholder:text-muted-foreground/60" /></div>{query && <p role="status" className="mt-2 text-xs text-muted-foreground">{visibleQuizzes.length} of {quizzes.length} quizzes match</p>}</div>}
      {loading && <p role="status" className="mt-3 text-xs text-muted-foreground">loading saved quizzes…</p>}
      {error && <p role="alert" className="mt-3 text-xs text-danger">{error} Use refresh to retry.</p>}
      {!loading && !error && !quizzes.length && <p className="mt-3 text-xs text-muted-foreground">Save your first quiz to add it to the library.</p>}
      {quizzes.length > 0 && !visibleQuizzes.length && <p className="mt-4 text-sm text-muted-foreground">No quizzes match your search. Clear the search to see every available quiz.</p>}
      {visibleQuizzes.length > 0 && <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">{visibleQuizzes.map((quiz) => <li key={quiz.id} className="flex items-center gap-2 py-4 sm:gap-3">
          <button type="button" disabled={busy} onClick={() => onLoad(quiz)} aria-label={`Open ${quiz.title}`} className="group min-w-0 flex-1 text-left disabled:opacity-50"><span className="block break-words text-base font-medium group-hover:text-accent">{quiz.title}</span><span className="mt-1 block text-xs text-muted-foreground">{quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"} · updated {new Date(quiz.updatedAt).toLocaleDateString()}</span><span className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent">open quiz<ArrowRight aria-hidden="true" className="h-3 w-3" /></span></button>
          <Button type="button" variant="ghost" disabled={busy} className="h-10 w-10 shrink-0 px-0" aria-label={`Export ${quiz.title}`} onClick={() => onExport(quiz)}><Download className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" disabled={busy} className="h-10 w-10 shrink-0 px-0" aria-label={`Delete ${quiz.title}`} onClick={() => onDelete(quiz)}><Trash2 className="h-4 w-4" /></Button>
        </li>)}</ul>}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{shared ? "Everyone can add, edit or remove quizzes from this library. " : ""}<a href="#quiz-editor" className="text-accent hover:underline">Import your own quiz below.</a></p>
    </section>
  );
}
