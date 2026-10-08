import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { MAX_IMPORT_BYTES, MAX_QUESTIONS, parseQuiz, sameQuestions, serializeQuiz, type ParseResult } from "../lib/quiz";
import { SAMPLE_HTML, SAMPLE_JSON } from "../lib/sample";
import { GUIDE_HTML, GUIDE_JSON } from "../components/QuizFormatGuide";
import { buildRun, DEFAULT_SETTINGS, scoreQuiz } from "../lib/session";
import { DRAFT_KEY, LIBRARY_KEY, SESSION_KEY, readDraft, readLibrary, readStage, writeStored } from "../lib/storage";

const dom = new JSDOM("", { url: "https://quiz.test" });
Object.defineProperty(globalThis, "document", { value: dom.window.document });
Object.defineProperty(globalThis, "localStorage", { value: dom.window.localStorage, configurable: true });
const valid = { id: "q1", question: "What is 2 + 2?", options: { A: "4", B: "5" }, correctAnswer: "A" };
function success(result: ParseResult) {
  if (!result.ok) assert.fail(result.error);
  return result;
}

test("imports every question and answer from the supplied 140-question HTML", () => {
  const raw = readFileSync(new URL("../public/examples/software-testing-quiz.html", import.meta.url), "utf8");
  const result = success(parseQuiz(raw));
  assert.equal(result.format, "html");
  assert.equal(result.title, "Software Testing");
  assert.equal(result.questions.length, 140);
  assert.deepEqual(result.warnings, []);
  assert.equal(new Set(result.questions.map((question) => question.topic)).size, 12);
  assert.equal(result.questions[0].correctKey, "C");
  assert.equal(result.questions[0].options[2].text, "75%");
  assert.equal(result.questions[0].explanation, "Coverage is 45 / 60 x 100 = 75%.");
  const source = dom.window.document.createElement("template"); source.innerHTML = raw;
  for (const [index, article] of Array.from(source.content.querySelectorAll("article.question")).entries()) {
    const question = result.questions[index];
    const marked = article.querySelector(".option.correct")!;
    assert.equal(question.prompt, article.querySelector("legend")!.textContent!.trim());
    assert.equal(question.options.length, 4);
    assert.equal(question.correctKey, marked.querySelector(".letter")!.textContent!.trim());
    assert.equal(question.options.find((option) => option.key === question.correctKey)!.text, marked.querySelector(".option-text")!.textContent!.trim());
    assert.ok(question.explanation);
    assert.ok(question.source);
  }
  const roundTrip = success(parseQuiz(serializeQuiz(result.title!, result.questions)));
  assert.deepEqual(roundTrip.questions, result.questions);
  const jsonExample = success(parseQuiz(readFileSync(new URL("../public/examples/software-testing-quiz.json", import.meta.url), "utf8")));
  assert.deepEqual(jsonExample.questions, result.questions);
});

test("HTML and JSON templates and built-in samples import correctly", () => {
  assert.equal(success(parseQuiz(SAMPLE_JSON)).questions.length, 2);
  assert.equal(success(parseQuiz(SAMPLE_HTML)).questions[0].correctKey, "B");
  for (const file of ["quiz-template.html", "quiz-template.json"]) {
    const result = success(parseQuiz(readFileSync(new URL(`../public/examples/${file}`, import.meta.url), "utf8")));
    assert.equal(result.questions.length, 2);
    assert.deepEqual(result.questions.map((question) => question.correctKey), ["A", "C"]);
  }
});

test("homepage question-format examples include valid answers and complete explanations", () => {
  for (const raw of [GUIDE_JSON, GUIDE_HTML]) {
    const result = success(parseQuiz(raw));
    assert.equal(result.questions.length, 1);
    assert.equal(result.questions[0].correctKey, "C");
    assert.match(result.questions[0].explanation!, /45 ÷ 60 × 100 = 75%/);
    assert.deepEqual(result.warnings, []);
  }
});

test("supports question aliases, answer text, flags, and zero-based indices", () => {
  const input = [
    { ...valid, correctAnswer: undefined, correctIndex: 1 },
    { ...valid, correctAnswer: 0 },
    { ...valid, correctAnswer: "5" },
    { Prompt: "Pick one", Choices: ["First", "Second"], Answer: "b" },
    { question: "Flagged", options: [{ text: "One", correct: false }, { text: "Two", correct: true }] },
    { question: "Keys", options: { "1": "One", "2": "Two" }, correctAnswer: "2" },
  ];
  assert.deepEqual(success(parseQuiz(JSON.stringify({ title: "Numbers", questions: input }))).questions.map((question) => question.correctKey), ["B", "A", "B", "B", "B", "2"]);
  for (const index of [-1, 2, 9, 0.5]) assert.equal(parseQuiz(JSON.stringify([{ ...valid, correctAnswer: index }])).ok, false);
});

test("rejects missing, empty, duplicate, and ambiguous options without shifting answer indices", () => {
  const invalid = [
    { ...valid, options: ["", "four", "five"], correctAnswer: 1 },
    { ...valid, options: [{ key: "A", text: "four" }, { key: "a", text: "five" }] },
    { ...valid, options: ["same", "same"], correctAnswer: "same" },
    { ...valid, correctAnswer: "C" },
    { ...valid, question: "" },
  ];
  const result = success(parseQuiz(JSON.stringify([valid, ...invalid])));
  assert.equal(result.questions.length, 1);
  assert.equal(result.warnings.length, invalid.length);
});

test("handles duplicate and reserved ids without answer collisions", () => {
  const result = success(parseQuiz(JSON.stringify(["q1", "q1", "q1-2", "__proto__", "constructor"].map((id) => ({ ...valid, id })))));
  const ids = result.questions.map((question) => question.id);
  assert.equal(new Set(ids).size, 5);
  assert.ok(!ids.includes("__proto__") && !ids.includes("constructor"));
});

test("handles fenced JSON and trailing commas while preserving quoted answer text", () => {
  const raw = '```json\n[{"question":"Literal ,] and smart “quotes”", "options":["a,]", "b"], "correctAnswer":"A",},]\n```';
  const question = success(parseQuiz(raw)).questions[0];
  assert.equal(question.prompt, "Literal ,] and smart “quotes”");
  assert.equal(question.options[0].text, "a,]");
});

test("HTML imports remain inert and preserve decoded text", () => {
  const raw = `<title>Safe</title><script>globalThis.__quizScriptRan = true</script><img src="https://invalid.test/tracker" onerror="globalThis.__quizScriptRan=true"><article class="question"><h2>&lt;script&gt; &amp; text</h2><div class="option correct"><b class="letter">A</b><span class="option-text">Safe &amp; sound<script>throw 1</script></span></div><div class="option"><span class="letter">B</span><span class="option-text">Other</span></div></article>`;
  const result = success(parseQuiz(raw));
  assert.equal(result.questions[0].prompt, "<script> & text");
  assert.equal(result.questions[0].options[0].text, "Safe & sound");
  assert.equal(Reflect.get(globalThis, "__quizScriptRan"), undefined);
  assert.equal(dom.window.document.querySelectorAll("script, img, article").length, 0);
});

test("rejects conflicting or missing HTML answers and supports embedded JSON", () => {
  assert.equal(parseQuiz(SAMPLE_HTML.replace('data-answer="1"', 'data-answer="0"')).ok, false);
  assert.equal(parseQuiz(SAMPLE_HTML.replace('data-answer="1"', "").replace("option correct", "option")).ok, false);
  assert.equal(parseQuiz("<h1>No questions</h1>").ok, false);
  assert.equal(success(parseQuiz(`<script type="application/json">${JSON.stringify([valid])}</script>`)).questions.length, 1);
});

test("rejects malformed, empty, and oversized imports", () => {
  for (const raw of ["", "[]", "null", "{broken", "[1]", "{}"] ) assert.equal(parseQuiz(raw).ok, false);
  assert.equal(parseQuiz("x".repeat(MAX_IMPORT_BYTES + 1)).ok, false);
  assert.equal(parseQuiz(JSON.stringify(Array.from({ length: MAX_QUESTIONS + 1 }, () => valid))).ok, false);
});

test("question and option shuffles preserve answer keys, source data, and scoring", () => {
  const source = success(parseQuiz(SAMPLE_JSON)).questions;
  const before = JSON.stringify(source);
  for (let i = 0; i < 20; i++) {
    const run = buildRun(source, { ...DEFAULT_SETTINGS, shuffleQuestions: true, shuffleOptions: true });
    const answers = Object.fromEntries(run.map((question) => [question.id, question.correctKey]));
    assert.equal(scoreQuiz(run, answers).percent, 100);
    assert.deepEqual(new Set(run.map((question) => question.id)), new Set(source.map((question) => question.id)));
  }
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(scoreQuiz(source, { [source[0].id]: "D" }), { correct: 0, wrong: 1, skipped: 1, percent: 0 });
});

test("draft migration, library recovery, and session restoration validate browser storage", () => {
  localStorage.clear();
  writeStored(DRAFT_KEY, { subject: "Old", json: SAMPLE_JSON });
  assert.equal(readDraft().raw, SAMPLE_JSON);
  const questions = success(parseQuiz(SAMPLE_JSON)).questions;
  writeStored(LIBRARY_KEY, [{ id: "saved", title: "Saved", questions, updatedAt: "2026-10-09" }, { id: "broken" }]);
  assert.equal(readLibrary().length, 1);
  const session = { subject: "Saved", source: questions, run: questions, settings: DEFAULT_SETTINGS, attempt: 0, progress: { index: 500, elapsedMs: 1200, answers: { [questions[0].id]: questions[0].correctKey, [questions[1].id]: "INVALID" } } };
  writeStored(SESSION_KEY, { name: "quiz", session });
  const stage = readStage();
  assert.equal(stage.name, "quiz");
  if (stage.name !== "quiz") return;
  assert.equal(stage.session.progress!.index, 1);
  assert.equal(stage.session.progress!.elapsedMs, 1200);
  assert.equal(stage.session.progress!.answers[questions[1].id], undefined);
  writeStored(SESSION_KEY, { name: "results", session, answers: { [questions[0].id]: questions[0].correctKey }, elapsedMs: 2000 });
  assert.equal(readStage().name, "results");
  localStorage.setItem(SESSION_KEY, "broken json");
  assert.equal(readStage().name, "setup");
});

test("blocked browser storage fails gracefully", () => {
  const previous = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
  try {
    assert.equal(writeStored(DRAFT_KEY, {}), false);
    assert.equal(readDraft().raw, "");
    assert.deepEqual(readLibrary(), []);
    assert.equal(readStage().name, "setup");
  } finally { Object.defineProperty(globalThis, "localStorage", { value: previous, configurable: true }); }
});

test("cloud quiz comparison ignores JSONB key order but detects explanation and answer edits", () => {
  const questions = success(parseQuiz(SAMPLE_JSON)).questions;
  const reordered = JSON.parse(JSON.stringify(questions, Object.keys(questions[0]).reverse().concat(["key", "text"])));
  assert.ok(sameQuestions(questions, reordered));
  assert.equal(sameQuestions(questions, questions.map((question, index) => index ? question : { ...question, explanation: "Edited explanation" })), false);
  assert.equal(sameQuestions(questions, [...questions].reverse()), false);
  assert.equal(sameQuestions(questions, questions.map((question) => ({ ...question, correctKey: "changed" }))), false);
});

test("restored sessions keep cloud quiz and attempt identities stable across reloads", () => {
  const questions = success(parseQuiz(SAMPLE_JSON)).questions;
  const runId = crypto.randomUUID();
  const quizId = crypto.randomUUID();
  writeStored(SESSION_KEY, { name: "results", session: { runId, quizId, subject: "Cloud quiz", source: questions, run: questions, settings: DEFAULT_SETTINGS, attempt: 0 }, answers: {}, elapsedMs: 1000 });
  const restored = readStage();
  assert.equal(restored.name, "results");
  if (restored.name !== "results") return;
  assert.equal(restored.session.runId, runId);
  assert.equal(restored.session.quizId, quizId);
  writeStored(DRAFT_KEY, { subject: "Cloud quiz", raw: SAMPLE_JSON, cloudId: quizId, cloudRevision: 7 });
  assert.equal(readDraft().cloudId, quizId);
  assert.equal(readDraft().cloudRevision, 7);
});
