"use client";

import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, Check, Code, Download, FileJson, LoaderCircle, Trash2, Upload } from "lucide-react";
import { MAX_IMPORT_BYTES, parseQuiz, type ImportFormat, type ParseResult } from "@/lib/quiz";
import { SAMPLE_HTML, SAMPLE_JSON } from "@/lib/sample";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

type Props = {
  raw: string; format: ImportFormat; parsed: ParseResult | null;
  onChange: (raw: string, format: ImportFormat, title?: string) => void;
};

export function QuizImport({ raw, format, parsed, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  function change(value: string, nextFormat: ImportFormat, title?: string) {
    request.current++;
    setBusy(false);
    setError("");
    setFilename("");
    onChange(value, nextFormat, title);
  }

  async function readFile(file: File) {
    const token = ++request.current;
    setError("");
    if (!/\.(?:json|html?)$/i.test(file.name)) { setError("Choose a .json, .html or .htm file."); return; }
    if (file.size > MAX_IMPORT_BYTES) { setError("Choose a file smaller than 5 MB."); return; }
    setBusy(true);
    try {
      const text = await file.text();
      if (token !== request.current) return;
      const nextFormat = /\.html?$/i.test(file.name) ? "html" : "json";
      const result = parseQuiz(text, nextFormat);
      if (!result.ok) { setError(result.error); return; }
      onChange(text, nextFormat, result.title ?? file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      setFilename(file.name);
    } catch { if (token === request.current) setError("Couldn't read that file. Please select it again."); }
    finally { if (token === request.current) setBusy(false); }
  }

  async function loadSoftwareQuiz() {
    const token = ++request.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/examples/software-testing-quiz.${format}`);
      if (!response.ok) throw new Error("unavailable");
      const text = await response.text();
      if (token !== request.current) return;
      const result = parseQuiz(text, format);
      if (!result.ok) throw new Error(result.error);
      onChange(text, format, result.title);
      setFilename(`software-testing-quiz.${format}`);
    } catch { if (token === request.current) setError("Couldn't load the example. You can still upload your own file."); }
    finally { if (token === request.current) setBusy(false); }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length !== 1) { setError("Import one quiz file at a time."); return; }
    void readFile(event.dataTransfer.files[0]);
  }

  return (
    <section aria-labelledby="import-heading" className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="import-heading" className="text-sm font-medium">bring your questions</h2>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-1" role="group" aria-label="Import format">
          {(["json", "html"] as const).map((item) => (
            <button type="button" key={item} aria-pressed={format === item}
              onClick={() => { if (format !== item) change(raw, item); }}
              className={cn("flex h-9 items-center gap-2 rounded-md px-3 text-xs", format === item ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {item === "json" ? <FileJson className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}{item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <input ref={fileRef} id="quiz-file" type="file" accept=".json,.html,.htm,application/json,text/html" className="sr-only"
        tabIndex={-1} aria-label="Upload quiz file"
        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void readFile(file); }} />
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}
        className={cn("mt-4 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors", dragging ? "border-accent bg-accent/10" : "border-white/20 bg-black/10 hover:border-accent/50 hover:bg-white/5")}>
        {busy ? <LoaderCircle className="h-5 w-5 animate-spin text-accent" /> : <Upload className="h-5 w-5 text-accent" />}
        <span className="text-sm font-medium">{busy ? "reading your quiz…" : "choose a file or drop it here"}</span>
        <span className="text-xs text-muted-foreground">HTML or JSON · up to 5 MB · processed on your device</span>
      </button>
      {filename && <p className="mt-2 break-all text-xs text-muted-foreground">loaded: {filename}</p>}
      {error && <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-danger"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="quiz-content" className="text-xs text-muted-foreground">or paste {format.toUpperCase()} below</label>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" className="h-9 px-3 text-xs" onClick={() => change(format === "html" ? SAMPLE_HTML : SAMPLE_JSON, format, "knowledge management")}>use sample</Button>
          <Button type="button" variant="ghost" className="h-9 px-3 text-xs" disabled={!raw} onClick={() => change("", format)}><Trash2 className="h-3.5 w-3.5" />clear</Button>
        </div>
      </div>
      <textarea id="quiz-content" value={raw} spellCheck={false} aria-invalid={Boolean(parsed && !parsed.ok)} aria-describedby="import-status"
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          const textarea = event.currentTarget;
          if (textarea.selectionStart === 0 && textarea.selectionEnd === raw.length) {
            event.preventDefault();
            const result = parseQuiz(text);
            const nextFormat = /^(?:<|```html)/i.test(text.trim()) ? "html" : "json";
            change(text, nextFormat, result.ok ? result.title : undefined);
          }
        }}
        onChange={(event) => change(event.target.value, format)}
        placeholder={format === "html" ? SAMPLE_HTML : '[\n  {\n    "question": "What is 2 + 2?",\n    "options": { "A": "4", "B": "5" },\n    "correctAnswer": "A"\n  }\n]'}
        className={cn("mt-2 h-52 w-full resize-y rounded-xl border bg-black/20 p-4 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/60", parsed && !parsed.ok ? "border-danger/40" : "border-white/10 hover:border-white/20")} />
      <div id="import-status" role="status" className="mt-3 min-h-5 text-xs">
        {parsed?.ok && <span className="inline-flex items-center gap-1.5 text-success"><Check className="h-4 w-4" />{parsed.questions.length} questions ready{parsed.warnings.length > 0 ? ` · ${parsed.warnings.length} skipped` : ""}</span>}
        {parsed && !parsed.ok && <span className="inline-flex items-start gap-1.5 text-danger"><AlertCircle className="h-4 w-4 shrink-0" />{parsed.error}</span>}
        {!parsed && <span className="text-muted-foreground">Your quiz will be checked before you start.</span>}
      </div>
      {parsed?.ok && parsed.warnings.length > 0 && <details className="mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer text-danger">review skipped questions</summary><ul className="mt-2 list-disc space-y-1 pl-4">{parsed.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
      {parsed?.ok && <details className="mt-3 rounded-lg border border-white/10 p-3 text-xs"><summary className="cursor-pointer text-muted-foreground">preview questions</summary><ol className="mt-3 list-decimal space-y-3 pl-4">{parsed.questions.slice(0, 3).map((question) => <li key={question.id}><p className="whitespace-pre-wrap">{question.prompt}</p><p className="mt-1 text-muted-foreground">{question.options.length} options{question.topic ? ` · ${question.topic}` : ""}</p></li>)}</ol>{parsed.questions.length > 3 && <p className="mt-3 text-muted-foreground">and {parsed.questions.length - 3} more</p>}</details>}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <button type="button" className="text-accent hover:underline disabled:opacity-50" disabled={busy} onClick={() => void loadSoftwareQuiz()}>try software testing · 140 questions</button>
        <a href={format === "html" ? "/examples/quiz-template.html" : "/examples/quiz-template.json"} download className="inline-flex items-center gap-1.5 hover:text-foreground"><Download className="h-3 w-3" />download {format.toUpperCase()} template</a>
      </div>
      <details className="mt-4 text-xs leading-relaxed text-muted-foreground"><summary className="cursor-pointer">supported {format.toUpperCase()} format</summary>
        <p className="mt-2">{format === "json" ? 'Use a question array, or { "title": "My quiz", "questions": [...] }. Each question needs question/prompt, options, and correctAnswer/correctKey. Answers can be a letter, exact option text, or a zero-based correctIndex. Explanations and topics are optional.' : 'Use .question blocks with a legend or heading, .option elements, and .option-text for the answer text. Mark one option with .correct, or set data-answer to its data-index (starting at 0). Your software testing HTML is supported. Scripts are never run.'}</p>
      </details>
    </section>
  );
}
