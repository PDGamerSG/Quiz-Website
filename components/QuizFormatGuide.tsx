"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { ImportFormat } from "@/lib/quiz";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

export const GUIDE_JSON = `{
  "title": "Software testing",
  "questions": [
    {
      "question": "Tests execute 45 of 60 statements. What is the statement coverage?",
      "options": {
        "A": "60%",
        "B": "80%",
        "C": "75%",
        "D": "100%"
      },
      "correctAnswer": "C",
      "explanation": "Statement coverage = executed statements ÷ total executable statements × 100. Here, 45 ÷ 60 × 100 = 75%. Full coverage (100%) would require executing all 60 statements. The other percentages do not match this calculation.",
      "topic": "Coverage"
    }
  ]
}`;

export const GUIDE_HTML = `<title>Software testing</title>
<article class="question" id="q1" data-answer="2" data-topic="Coverage">
  <fieldset>
    <legend>Tests execute 45 of 60 statements. What is the statement coverage?</legend>
    <label class="option" data-index="0">
      <span class="letter">A</span><span class="option-text">60%</span>
    </label>
    <label class="option" data-index="1">
      <span class="letter">B</span><span class="option-text">80%</span>
    </label>
    <label class="option correct" data-index="2">
      <span class="letter">C</span><span class="option-text">75%</span>
    </label>
    <label class="option" data-index="3">
      <span class="letter">D</span><span class="option-text">100%</span>
    </label>
  </fieldset>
  <div class="answer">
    <p>Statement coverage = executed statements ÷ total executable statements × 100. Here, 45 ÷ 60 × 100 = 75%. Full coverage (100%) would require executing all 60 statements. The other percentages do not match this calculation.</p>
  </div>
</article>`;

export function QuizFormatGuide() {
  const [format, setFormat] = useState<ImportFormat>("json");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const example = format === "json" ? GUIDE_JSON : GUIDE_HTML;

  async function copy() {
    try { await navigator.clipboard.writeText(example); setCopyState("copied"); }
    catch { setCopyState("failed"); }
  }

  return (
    <section aria-labelledby="format-heading" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="format-heading" className="text-base font-medium">how to format your questions</h2>
        <div role="group" aria-label="Example format" className="flex gap-1 rounded-lg border border-white/10 p-1">
          {(["json", "html"] as const).map((item) => <button key={item} type="button" aria-pressed={format === item} onClick={() => { setFormat(item); setCopyState("idle"); }} className={cn("h-9 rounded-md px-3 text-xs", format === item ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground")}>{item.toUpperCase()}</button>)}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Use this format for each question. Add your own explanation to help learners understand the answer.</p>
      <dl className="mt-4 grid gap-x-4 gap-y-2 text-xs leading-relaxed sm:grid-cols-[8rem_1fr]">
        <dt className="font-medium">question</dt><dd className="text-muted-foreground">The complete question text.</dd>
        <dt className="font-medium">options</dt><dd className="text-muted-foreground">At least two choices with unique letters.</dd>
        <dt className="font-medium">correct answer</dt><dd className="text-muted-foreground">{format === "json" ? 'Use the matching letter in "correctAnswer".' : 'Mark the correct option with class="option correct". Match data-answer to its data-index; indices start at 0.'}</dd>
        <dt className="font-medium text-accent">explanation</dt><dd className="text-muted-foreground">{format === "json" ? 'Write your reasoning in the "explanation" field.' : 'Put your reasoning inside <div class="answer"><p>…</p></div>.'} Include steps or formulas and explain why other options fail.</dd>
        <dt className="font-medium">topic (optional)</dt><dd className="text-muted-foreground">Group questions for focused practice.</dd>
      </dl>
      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
        <span className="text-xs text-muted-foreground">complete {format.toUpperCase()} example</span>
        <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => void copy()}>{copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copyState === "copied" ? "copied" : "copy example"}</Button>
      </div>
      {copyState === "failed" && <p role="status" className="mt-2 text-xs text-muted-foreground">Select and copy the example below. Clipboard access is unavailable in this browser.</p>}
      <pre tabIndex={0} aria-label={`${format.toUpperCase()} question format example`} className="mt-2 max-h-[32rem] overflow-auto rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-relaxed"><code className="whitespace-pre-wrap break-words">{example}</code></pre>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Add more question objects to the JSON array, or repeat the HTML article for each question. You can also add or edit explanations after importing a quiz. With instant feedback off, explanations appear after finishing.</p>
    </section>
  );
}
