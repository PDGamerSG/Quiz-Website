export type QuizOption = { key: string; text: string };

export type Question = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctKey: string;
  explanation?: string;
  topic?: string;
  source?: string;
};

export type ImportFormat = "json" | "html";
export type ParseResult =
  | { ok: true; questions: Question[]; warnings: string[]; title?: string; format: ImportFormat }
  | { ok: false; error: string };

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_QUESTIONS = 2000;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const found = Object.keys(record).find((name) => name.toLowerCase() === key.toLowerCase());
    if (found !== undefined && record[found] != null) return record[found];
  }
}

function relaxedParse(raw: string): unknown {
  const unfenced = raw.trim().replace(/^```(?:json|javascript|js)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(unfenced); }
  catch {
    // Remove trailing commas only outside quoted strings. Never rewrite answer text.
    const cleaned = unfenced.replace(/"(?:\\.|[^"\\])*"|,(?=\s*[}\]])/g, (match) => match === "," ? "" : match);
    return JSON.parse(cleaned);
  }
}

function readOptions(raw: unknown): QuizOption[] | null {
  if (Array.isArray(raw)) {
    const options: QuizOption[] = [];
    for (const [index, entry] of raw.entries()) {
      const record = entry && typeof entry === "object" && !Array.isArray(entry)
        ? entry as Record<string, unknown> : null;
      const text = asText(record ? pick(record, ["text", "option", "label", "value", "answer"]) : entry);
      const key = asText(record ? pick(record, ["key", "id", "letter"]) : null) ?? LETTERS[index] ?? String(index + 1);
      if (!text) return null;
      options.push({ key, text });
    }
    return options;
  }
  if (raw && typeof raw === "object") {
    const options: QuizOption[] = [];
    for (const [key, value] of Object.entries(raw)) {
      const text = asText(value);
      if (!key.trim() || !text) return null;
      options.push({ key: key.trim(), text });
    }
    return options;
  }
  return null;
}

function resolveCorrectKey(record: Record<string, unknown>, options: QuizOption[]): string | null {
  const index = pick(record, ["correctIndex", "answerIndex"]);
  if (index !== undefined) {
    const number = typeof index === "number" ? index : /^\d+$/.test(String(index)) ? Number(index) : NaN;
    return Number.isInteger(number) ? options[number]?.key ?? null : null;
  }
  const value = pick(record, ["correctKey", "correctAnswer", "answerKey", "answer", "correct"])
    ?? pick(record, ["correctOption", "correctText", "answerText"]);
  if (value === undefined) {
    const rawOptions = pick(record, ["options", "choices", "answers"]);
    if (!Array.isArray(rawOptions)) return null;
    const flagged = rawOptions.flatMap((option, index) =>
      option && typeof option === "object" && pick(option, ["correct", "isCorrect"]) === true ? [index] : []);
    return flagged.length === 1 ? options[flagged[0]]?.key ?? null : null;
  }
  if (typeof value === "number") return Number.isInteger(value) ? options[value]?.key ?? null : null;
  const text = asText(value);
  if (!text) return null;
  const key = options.find((option) => option.key.toLowerCase() === text.toLowerCase());
  if (key) return key.key;
  const matches = options.filter((option) => option.text.toLowerCase() === text.toLowerCase());
  if (matches.length === 1) return matches[0].key;
  return /^\d+$/.test(text) ? options[Number(text)]?.key ?? null : null;
}

function normalizeQuestions(data: unknown, format: ImportFormat, title?: string): ParseResult {
  if (!Array.isArray(data)) return { ok: false, error: 'Expected an array of questions or an object with a "questions" array.' };
  if (!data.length) return { ok: false, error: "Add at least one question." };
  if (data.length > MAX_QUESTIONS) return { ok: false, error: `A quiz can contain up to ${MAX_QUESTIONS.toLocaleString()} questions.` };
  const questions: Question[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  data.forEach((entry, index) => {
    const skip = (reason: string) => warnings.push(`Question ${index + 1} skipped: ${reason}`);
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return skip("it must be an object.");
    const record = entry as Record<string, unknown>;
    const prompt = asText(pick(record, ["question", "prompt", "text", "title", "q"]));
    if (!prompt) return skip("question text is missing.");
    const options = readOptions(pick(record, ["options", "choices", "answers"]));
    if (!options || options.length < 2) return skip("at least two nonempty options are required.");
    if (new Set(options.map((option) => option.key.toLowerCase())).size !== options.length) return skip("option keys must be unique.");
    const correctKey = resolveCorrectKey(record, options);
    if (correctKey === null) return skip("the correct answer must match one option; numeric indices start at 0.");
    const rawId = asText(pick(record, ["id"])) ?? `q-${index + 1}`;
    const baseId = rawId in Object.prototype ? `q-${rawId}` : rawId;
    let id = baseId;
    let suffix = 2;
    while (seen.has(id)) id = `${baseId}-${suffix++}`;
    seen.add(id);
    questions.push({
      id, prompt, options, correctKey,
      explanation: asText(pick(record, ["explanation", "reason", "note"])) ?? undefined,
      topic: asText(pick(record, ["topic", "category", "group"])) ?? undefined,
      source: asText(pick(record, ["source", "reference"])) ?? undefined,
    });
  });
  if (!questions.length) return { ok: false, error: warnings[0] ?? "No usable questions found." };
  return { ok: true, questions, warnings, title, format };
}

function parseJson(raw: string): ParseResult {
  let data: unknown;
  try { data = relaxedParse(raw); }
  catch { return { ok: false, error: "Invalid JSON. Check for a missing comma, bracket or double quote." }; }
  let title: string | undefined;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    title = asText(pick(record, ["title", "subject", "name"])) ?? undefined;
    data = pick(record, ["questions", "quiz", "items", "data"]);
  }
  return normalizeQuestions(data, "json", title);
}

function elementText(element: Element | null): string | undefined {
  if (!element) return undefined;
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("script, style, .correct-badge, input").forEach((node) => node.remove());
  clone.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  return clone.textContent?.replace(/[\t\r ]+/g, " ").replace(/\n\s*\n/g, "\n").trim() || undefined;
}

function parseHtml(raw: string): ParseResult {
  if (typeof document === "undefined") return { ok: false, error: "HTML import is available in the browser." };
  // Template contents remain inert: scripts, handlers, frames and images are never mounted.
  const template = document.createElement("template");
  template.innerHTML = raw.replace(/^```html\s*/i, "").replace(/```\s*$/, "");
  const root = template.content;
  const title = elementText(root.querySelector("title"))?.split(/\s*[|]\s*/)[0]
    ?? elementText(root.querySelector("h1"));
  const embedded = root.querySelector('script[type="application/json"]');
  if (embedded?.textContent) {
    const parsed = parseJson(embedded.textContent);
    if (parsed.ok) return { ...parsed, title: parsed.title ?? title, format: "html" };
  }
  const articles = Array.from(root.querySelectorAll(".question, [data-question]"))
    .filter((element) => !element.parentElement?.closest(".question, [data-question]"));
  if (!articles.length) return { ok: false, error: 'No quiz questions found. Use HTML question blocks with class="question", a legend or heading, options, and a marked correct answer. JavaScript-only quizzes need a JSON export.' };
  const entries = articles.map((article) => {
    const nodes = Array.from(article.querySelectorAll(".option, [data-option]"));
    const options = nodes.map((option, index) => {
      const textNode = option.querySelector(".option-text");
      const clone = option.cloneNode(true) as Element;
      clone.querySelectorAll(".letter").forEach((node) => node.remove());
      return {
        key: elementText(option.querySelector(".letter"))
          ?? option.getAttribute("data-key") ?? LETTERS[index] ?? String(index + 1),
        text: elementText(textNode ?? clone),
      };
    });
    const marked = nodes.flatMap((option, index) =>
      option.classList.contains("correct") || option.getAttribute("data-correct") === "true" ? [index] : []);
    const answer = article.getAttribute("data-answer");
    let correctKey: string | undefined;
    if (answer !== null) {
      const matched = nodes.findIndex((option) => option.getAttribute("data-index") === answer);
      correctKey = matched >= 0 ? options[matched].key
        : options.find((option) => option.key.toLowerCase() === answer.toLowerCase())?.key
          ?? (/^\d+$/.test(answer) ? options[Number(answer)]?.key : undefined);
    } else if (marked.length === 1) correctKey = options[marked[0]].key;
    if (marked.length > 1 || (marked.length === 1 && correctKey !== options[marked[0]].key)) correctKey = undefined;
    return {
      id: article.id || undefined,
      question: elementText(article.querySelector("legend, [data-prompt], .question-text, h2, h3")),
      options, correctKey,
      explanation: Array.from(article.querySelectorAll(".answer p, .explanation")).map(elementText).filter(Boolean).join("\n") || undefined,
      topic: article.getAttribute("data-topic") ?? elementText(article.querySelector(".question-meta span:last-child")),
      source: elementText(article.querySelector(".source")),
    };
  });
  return normalizeQuestions(entries, "html", title);
}

export function parseQuiz(raw: string, format?: ImportFormat): ParseResult {
  const trimmed = raw.trim().replace(/^\uFEFF/, "");
  if (!trimmed) return { ok: false, error: "Upload a file or paste your questions first." };
  if (new Blob([raw]).size > MAX_IMPORT_BYTES) return { ok: false, error: "Choose a file smaller than 5 MB." };
  return (format ?? (/^(?:<|```html)/i.test(trimmed) ? "html" : "json")) === "html" ? parseHtml(trimmed) : parseJson(trimmed);
}

export function serializeQuiz(title: string, questions: Question[]): string {
  return JSON.stringify({ title, questions }, null, 2);
}
