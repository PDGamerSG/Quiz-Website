"use client";

import { BookOpen, Download, Trash2 } from "lucide-react";
import { serializeQuiz } from "@/lib/quiz";
import { downloadJson } from "@/lib/download";
import type { SavedQuiz } from "@/lib/storage";
import { Button } from "./ui";

export function QuizLibrary({ quizzes, onLoad, onDelete }: {
  quizzes: SavedQuiz[]; onLoad: (quiz: SavedQuiz) => void; onDelete: (quiz: SavedQuiz) => void;
}) {
  return (
    <section aria-labelledby="library-heading" className="mt-10">
      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /><h2 id="library-heading" className="text-sm font-medium">your quiz library</h2><span className="text-xs text-muted-foreground">{quizzes.length}</span></div>
      {!quizzes.length ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Saved quizzes appear here. Starting a quiz also saves a copy on this browser.</p> :
        <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">{quizzes.map((quiz) => <li key={quiz.id} className="flex items-center gap-3 py-4">
          <button type="button" onClick={() => onLoad(quiz)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm hover:text-accent">{quiz.title}</span><span className="mt-1 block text-xs text-muted-foreground">{quiz.questions.length} questions · open quiz</span></button>
          <Button type="button" variant="ghost" className="h-10 w-10 shrink-0 px-0" aria-label={`Export ${quiz.title}`} onClick={() => downloadJson(quiz.title, serializeQuiz(quiz.title, quiz.questions))}><Download className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" className="h-10 w-10 shrink-0 px-0" aria-label={`Delete ${quiz.title}`} onClick={() => onDelete(quiz)}><Trash2 className="h-4 w-4" /></Button>
        </li>)}</ul>}
    </section>
  );
}
