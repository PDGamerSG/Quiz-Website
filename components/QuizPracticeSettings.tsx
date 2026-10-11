"use client";

import { useMemo } from "react";
import { RotateCcw, Shuffle, Zap } from "lucide-react";
import type { Question } from "@/lib/quiz";
import type { QuizSettings } from "@/lib/session";
import { cn } from "@/lib/utils";

const TOGGLES = [
  { id: "shuffleQuestions", label: "shuffle questions", hint: "a fresh order each run", icon: Shuffle },
  { id: "shuffleOptions", label: "shuffle options", hint: "mix up the answer order", icon: RotateCcw },
  { id: "instantFeedback", label: "instant feedback", hint: "see answers as you go", icon: Zap },
] as const;

export function QuizPracticeSettings({ questions, settings, topic, onTopicChange, onChange }: {
  questions: Question[];
  settings: QuizSettings;
  topic: string;
  onTopicChange: (topic: string) => void;
  onChange: (settings: QuizSettings) => void;
}) {
  const topics = useMemo(() => Array.from(new Set(questions.flatMap((question) => question.topic ? [question.topic] : []))), [questions]);
  const count = topic ? questions.filter((question) => question.topic === topic).length : questions.length;

  return <>
    {topics.length > 1 && <div className="mt-6">
      <label htmlFor="topic" className="text-sm font-medium">focus on a topic</label>
      <select id="topic" value={topic} onChange={(event) => onTopicChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-card px-3 text-sm">
        <option value="">all topics · {questions.length} questions</option>
        {topics.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <p className="mt-2 text-xs text-muted-foreground">{count} questions in this run</p>
    </div>}
    <fieldset className="mt-7">
      <legend className="text-sm font-medium">make it your practice</legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {TOGGLES.map(({ id, label, hint, icon: Icon }) => <button key={id} type="button" role="switch" aria-label={label} aria-checked={settings[id]}
          onClick={() => onChange({ ...settings, [id]: !settings[id] })}
          className={cn("rounded-xl border p-4 text-left transition-colors", settings[id] ? "border-accent/40 bg-accent/10" : "border-white/10 bg-white/5 hover:bg-white/10")}>
          <div className="flex items-center justify-between"><Icon aria-hidden="true" className={cn("h-4 w-4", settings[id] ? "text-accent" : "text-muted-foreground")} /><span className="text-[10px] text-muted-foreground">{settings[id] ? "ON" : "OFF"}</span></div>
          <span className="mt-3 block text-sm font-medium">{label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
        </button>)}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{settings.instantFeedback ? "Your first answer is locked, with the answer and explanation shown immediately." : "Exam mode: change your answers freely and see answers and explanations after finishing."}</p>
    </fieldset>
  </>;
}
