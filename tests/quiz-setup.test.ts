import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { act, createElement, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { SetupScreen } from "../components/SetupScreen";
import { cloud } from "../lib/cloud";
import type { CloudQuiz } from "../lib/cloud-types";
import { serializeQuiz, type Question } from "../lib/quiz";
import { DEFAULT_SETTINGS } from "../lib/session";
import { DRAFT_KEY, readDraft, writeStored, type Draft } from "../lib/storage";

const questions: Question[] = [1, 2, 3].map((number) => ({
  id: `q${number}`, prompt: `Question ${number}`,
  options: [{ key: "A", text: "First option" }, { key: "B", text: "Second option" }],
  correctKey: "A", explanation: "The first option is correct.", source: "Chapter one", topic: number === 3 ? "Other topic" : "Main topic",
}));
const savedQuiz: CloudQuiz = {
  id: "11111111-1111-4111-8111-111111111111", title: "Saved quiz", questions,
  questionCount: questions.length, revision: 4, createdAt: "2026-10-11T00:00:00Z", updatedAt: "2026-10-11T00:00:00Z",
};
const draft: Draft = { subject: savedQuiz.title, raw: serializeQuiz(savedQuiz.title, questions), format: "json", settings: DEFAULT_SETTINGS, view: "edit" };
type StartPayload = Parameters<ComponentProps<typeof SetupScreen>["onStart"]>[0];

async function renderSetup(context: TestContext, initialDraft?: Draft) {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true })) {
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
  context.mock.timers.enable({ apis: ["setTimeout"] });
  Object.defineProperty(globalThis, "requestAnimationFrame", { value: (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0), configurable: true });
  const list = context.mock.method(cloud, "listQuizzes", async () => ({ quizzes: [savedQuiz], visibility: "shared" as const }));
  const get = context.mock.method(cloud, "getQuiz", async () => ({ quiz: savedQuiz }));
  const save = context.mock.method(cloud, "saveQuiz", async () => ({ quiz: savedQuiz, created: true }));
  context.mock.method(cloud, "listAttempts", async () => ({ attempts: [] }));
  if (initialDraft) writeStored(DRAFT_KEY, initialDraft);
  let root = createRoot(document.getElementById("root")!);
  const starts: StartPayload[] = [];
  const props = { onStart: (payload: StartPayload) => starts.push(payload), onReview: () => {} };
  await act(async () => root.render(createElement(SetupScreen, props)));
  context.after(() => { act(() => root.unmount()); dom.window.close(); });

  async function click(selector: string) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    assert.ok(button, `Missing button ${selector}`);
    await act(async () => button.click());
  }
  async function button(text: string) {
    const item = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.trim() === text);
    assert.ok(item, `Missing button ${text}`);
    await act(async () => item.click());
  }
  async function reload() {
    act(() => root.unmount());
    root = createRoot(document.getElementById("root")!);
    await act(async () => root.render(createElement(SetupScreen, props)));
  }
  function tick(ms: number) { act(() => context.mock.timers.tick(ms)); }
  return { click, button, reload, tick, starts, list, get, save, dom };
}

test("saved quizzes open practice settings and start the selected questions without a cloud write", async (context) => {
  const setup = await renderSetup(context);
  await setup.click(`button[aria-label="Start ${savedQuiz.title}"]`);
  assert.equal(document.querySelector("#quiz-start-heading")?.textContent, savedQuiz.title);
  assert.equal(document.activeElement?.id, "quiz-start-heading");
  assert.equal(document.querySelector("#quiz-content"), null);
  assert.equal(setup.get.mock.callCount(), 1);
  assert.equal(setup.starts.length, 0);

  for (const name of ["shuffle questions", "shuffle options", "instant feedback"]) {
    await setup.click(`button[role="switch"][aria-label="${name}"]`);
  }
  const topic = document.querySelector<HTMLSelectElement>("#topic")!;
  await act(async () => { topic.value = "Main topic"; topic.dispatchEvent(new setup.dom.window.Event("change", { bubbles: true })); });
  await setup.button("start quiz · 2 questions");
  assert.deepEqual(setup.starts, [{ subject: "Saved quiz · Main topic", questions: questions.slice(0, 2), settings: { shuffleQuestions: true, shuffleOptions: true, instantFeedback: false }, quizId: savedQuiz.id }]);
  assert.equal(setup.save.mock.callCount(), 0);
  assert.equal(readDraft().view, "start");
  assert.deepEqual(readDraft().settings, setup.starts[0].settings);
});

test("saving a new quiz replaces the editor with a start panel that survives reload", async (context) => {
  const setup = await renderSetup(context, draft);
  await setup.button("save quiz");
  assert.equal(setup.save.mock.callCount(), 1);
  assert.equal(setup.starts.length, 0);
  assert.equal(document.querySelector("#quiz-content"), null);
  assert.equal(readDraft().cloudRevision, savedQuiz.revision);
  assert.equal(readDraft().view, "start");

  await setup.click('button[role="switch"][aria-label="shuffle options"]');
  setup.tick(400);
  await setup.reload();
  assert.equal(document.querySelector("#quiz-start-heading")?.textContent, savedQuiz.title);
  assert.equal(document.querySelector('button[aria-label="shuffle options"]')?.getAttribute("aria-checked"), "true");
  await setup.button("start quiz · 3 questions");
  assert.equal(setup.save.mock.callCount(), 1);
  assert.equal(setup.starts[0].quizId, savedQuiz.id);
  assert.equal(setup.starts[0].settings.shuffleOptions, true);
});

test("editing a saved quiz remains in the editor on reload and saves with its revision", async (context) => {
  const setup = await renderSetup(context, { ...draft, cloudId: savedQuiz.id, cloudRevision: savedQuiz.revision, view: "start" });
  await setup.button("edit quiz");
  assert.equal(readDraft().view, "edit");
  await setup.reload();
  assert.ok(document.querySelector("#quiz-content"));
  assert.equal(document.querySelector("#quiz-start-heading"), null);
  await setup.button("save quiz");
  const input = setup.save.mock.calls[0].arguments[0];
  assert.ok(input);
  assert.equal(input.id, savedQuiz.id);
  assert.equal(input.revision, savedQuiz.revision);
  assert.ok(document.querySelector("#quiz-start-heading"));
});

test("starting from the editor saves once and begins an attempt with the saved identity", async (context) => {
  const setup = await renderSetup(context, draft);
  await setup.button("start quiz · 3 questions");
  assert.equal(setup.save.mock.callCount(), 1);
  assert.equal(setup.starts.length, 1);
  assert.equal(setup.starts[0].quizId, savedQuiz.id);
  assert.deepEqual(setup.starts[0].questions, questions);
  assert.equal(readDraft().view, "start");
});

test("importing another quiz clears the saved identity and opens a fresh editor", async (context) => {
  const setup = await renderSetup(context, { ...draft, cloudId: savedQuiz.id, cloudRevision: savedQuiz.revision, view: "start" });
  await setup.button("Import your own quiz.");
  assert.ok(document.querySelector("#quiz-content"));
  assert.equal(readDraft().raw, "");
  assert.equal(readDraft().cloudId, undefined);
  assert.equal(readDraft().cloudRevision, undefined);
  assert.equal(readDraft().view, "edit");
});

test("a failed save preserves the editor and allows an unsaved attempt", async (context) => {
  const setup = await renderSetup(context, draft);
  setup.save.mock.mockImplementation(async () => { throw new Error("Storage is unavailable."); });
  await setup.button("save quiz");
  assert.equal(document.querySelector("#quiz-start-heading"), null);
  assert.match(document.querySelector('[role="alert"]')?.textContent ?? "", /Storage is unavailable/);
  assert.equal(document.querySelector<HTMLTextAreaElement>("#quiz-content")?.value, draft.raw);
  await setup.button("start with this draft without saving");
  assert.equal(setup.starts[0].quizId, undefined);
  assert.deepEqual(setup.starts[0].questions, questions);
});

test("a conflicting quiz name keeps the imported questions in the editor", async (context) => {
  const setup = await renderSetup(context, draft);
  setup.save.mock.mockImplementation(async () => ({ quiz: { ...savedQuiz, questions: questions.slice(0, 1) }, created: false }));
  await setup.button("save quiz");
  assert.equal(document.querySelector("#quiz-start-heading"), null);
  assert.match(document.querySelector('[role="alert"]')?.textContent ?? "", /already exists/);
  setup.tick(400);
  assert.equal(readDraft().raw, draft.raw);
  assert.equal(readDraft().cloudId, undefined);
});
