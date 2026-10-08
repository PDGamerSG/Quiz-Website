"use client";

import { useState } from "react";
import { Check, MessageSquareText } from "lucide-react";
import type { Question } from "@/lib/quiz";
import { Button } from "./ui";

export function QuestionExplanationEditor({ questions, onSave }: {
  questions: Question[];
  onSave: (questionId: string, explanation: string) => void;
}) {
  const [editing, setEditing] = useState({ id: questions[0].id, text: questions[0].explanation ?? "" });
  const [saved, setSaved] = useState(false);
  const question = questions.find((item) => item.id === editing.id) ?? questions[0];
  const correct = question.options.find((option) => option.key === question.correctKey)!;
  const explained = questions.filter((item) => item.explanation).length;

  return (
    <details className="mt-6 border-t border-white/10 pt-5">
      <summary className="cursor-pointer text-sm font-medium">add or edit explanations <span className="ml-1 text-xs font-normal text-muted-foreground">{explained}/{questions.length} added</span></summary>
      <p id="explanation-hint" className="mt-3 text-xs leading-relaxed text-muted-foreground">Explain why the answer is correct, show the steps, and clarify any common mistakes. Learners see this after answering and in their answer review.</p>
      <label htmlFor="explanation-question" className="mt-4 block text-xs text-muted-foreground">choose a question</label>
      <select id="explanation-question" value={question.id}
        onChange={(event) => { const next = questions.find((item) => item.id === event.target.value)!; setEditing({ id: next.id, text: next.explanation ?? "" }); setSaved(false); }}
        className="mt-2 h-11 w-full min-w-0 rounded-xl border border-white/10 bg-card px-3 text-sm">
        {questions.map((item, index) => <option key={item.id} value={item.id}>Question {index + 1}: {item.prompt.slice(0, 90)}</option>)}
      </select>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{question.prompt}</p>
      <p className="mt-2 text-xs leading-relaxed text-success">correct answer: {correct.key} · {correct.text}</p>
      <label htmlFor="question-explanation" className="mt-4 flex items-center gap-2 text-sm font-medium"><MessageSquareText className="h-4 w-4 text-accent" />your explanation</label>
      <textarea id="question-explanation" value={editing.text} aria-describedby="explanation-hint" rows={5}
        onChange={(event) => { setEditing({ id: question.id, text: event.target.value }); setSaved(false); }}
        placeholder="The answer is correct because…\nHere is how to work it out…"
        className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed placeholder:text-muted-foreground/60" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" variant="glass" onClick={() => { onSave(question.id, editing.text.trim()); setSaved(true); }}>save explanation</Button>
        {saved && <p role="status" className="inline-flex items-center gap-1.5 text-xs text-success"><Check className="h-3.5 w-3.5" />explanation updated</p>}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Save the quiz to keep your changes in the library. Explanations are included in JSON exports. Leave the field blank to remove an explanation.</p>
    </details>
  );
}
