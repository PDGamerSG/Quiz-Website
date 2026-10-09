import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QuizScreen } from "../components/QuizScreen";
import type { Answers, Progress } from "../lib/session";
import type { Question } from "../lib/quiz";

const questions: Question[] = [1, 2, 3].map((number) => ({ id: `q${number}`, prompt: `Question ${number}`, options: [{ key: "A", text: "First option" }, { key: "B", text: "Second option" }], correctKey: "A", explanation: "The first option is correct." }));

function renderQuiz(context: TestContext, instantFeedback = true, initialProgress?: Progress) {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const root = createRoot(document.getElementById("root")!);
  const results: Array<{ answers: Answers; elapsedMs: number }> = [];
  let quits = 0;
  act(() => root.render(createElement(QuizScreen, { subject: "Navigation test", questions, instantFeedback, initialProgress, shortcutsEnabled: true, onProgress: () => {}, onFinish: (result) => { results.push(result); }, onQuit: () => { quits++; } })));
  context.after(() => { act(() => root.unmount()); dom.window.close(); });
  function click(selector: string) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    assert.ok(button, `Missing button ${selector}`);
    act(() => button.click());
  }
  function answer(key: "A" | "B") { click(`button[aria-pressed]:nth-child(${key === "A" ? 1 : 2})`); }
  function tick(ms: number) { act(() => context.mock.timers.tick(ms)); }
  function current() { return document.querySelector("h1")?.textContent; }
  function button(text: string) {
    const scope = document.querySelector("dialog[open]") ?? document;
    const item = Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === text);
    assert.ok(item, `Missing button ${text}`);
    act(() => item.click());
  }
  return { click, answer, tick, current, button, results, quits: () => quits };
}

test("answers advance exactly after two seconds and the final answer is included in results", (context) => {
  const quiz = renderQuiz(context);
  quiz.answer("A");
  assert.match(document.body.textContent!, /The first option is correct/);
  quiz.tick(1999); assert.equal(quiz.current(), "Question 1");
  quiz.tick(1); assert.equal(quiz.current(), "Question 2");
  quiz.answer("B"); quiz.tick(2000); assert.equal(quiz.current(), "Question 3");
  quiz.answer("A"); quiz.tick(1999); assert.equal(quiz.results.length, 0);
  quiz.tick(1); assert.equal(quiz.results.length, 1);
  assert.deepEqual(quiz.results[0].answers, { q1: "A", q2: "B", q3: "A" });
});

test("manual navigation cancels the pending move and revisiting an answer does not auto-advance", (context) => {
  const quiz = renderQuiz(context);
  quiz.answer("A"); quiz.tick(1000); quiz.button("next question");
  quiz.tick(3000); assert.equal(quiz.current(), "Question 2");
  quiz.click('button[aria-label="previous question"]');
  quiz.tick(3000); assert.equal(quiz.current(), "Question 1");
  quiz.answer("B"); quiz.tick(3000); assert.equal(quiz.current(), "Question 1");
});

test("changing an exam-mode answer restarts the two-second pause", (context) => {
  const quiz = renderQuiz(context, false);
  quiz.answer("A"); quiz.tick(1000); quiz.answer("B");
  quiz.tick(1000); assert.equal(quiz.current(), "Question 1");
  quiz.tick(999); assert.equal(quiz.current(), "Question 1");
  quiz.tick(1); assert.equal(quiz.current(), "Question 2");
  quiz.click('button[aria-label="previous question"]');
  assert.equal(document.querySelector('button[aria-pressed="true"]')?.textContent, "BSecond option");
});

test("restored answers stay put and dialogs cancel pending auto-navigation", (context) => {
  const quiz = renderQuiz(context, true, { index: 0, answers: { q1: "A" }, elapsedMs: 1000 });
  quiz.tick(3000); assert.equal(quiz.current(), "Question 1");
  quiz.button("next question"); quiz.answer("A"); quiz.button("finish this attempt");
  quiz.tick(3000); assert.equal(quiz.current(), "Question 2");
  assert.equal(quiz.results.length, 0);
  quiz.button("keep going"); quiz.tick(3000); assert.equal(quiz.current(), "Question 3");
  quiz.answer("A"); quiz.click('button[aria-label="leave quiz"]');
  quiz.tick(3000); assert.equal(quiz.results.length, 0); assert.equal(quiz.quits(), 1);
});

test("answering the last question with skipped questions opens confirmation after two seconds", (context) => {
  const quiz = renderQuiz(context);
  quiz.click('button[aria-label="go to question 3, unanswered"]');
  quiz.answer("A"); quiz.tick(2000);
  assert.match(document.querySelector("dialog")?.textContent ?? "", /finish with unanswered questions/);
  assert.equal(quiz.results.length, 0);
  quiz.button("finish quiz"); assert.equal(quiz.results.length, 1);
  assert.deepEqual(quiz.results[0].answers, { q3: "A" });
});
