import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { neon, neonConfig } from "@neondatabase/serverless";
import { databaseFetch } from "../lib/database-fetch";
import { DEFAULT_SETTINGS } from "../lib/session";
import { parseQuiz, sameQuestions } from "../lib/quiz";
import type { CloudQuiz, CloudAttempt } from "../lib/cloud-types";

async function main() {
  loadEnvConfig(process.cwd());
  neonConfig.fetchFunction = databaseFetch;
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before running integration checks.");
  const base = process.env.QUIZLY_TEST_URL ?? "http://localhost:3000";
  const title = `Integration check ${randomUUID()}`;
  const attemptId = randomUUID();
  let quiz: CloudQuiz | undefined;
  let cookie = "";
  async function request(path: string, method = "GET", body?: unknown, own = true, headers: Record<string, string> = {}) {
    const response = await fetch(`${base}/api/${path}`, {
      method, signal: AbortSignal.timeout(30000),
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(own && cookie ? { Cookie: cookie } : {}), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (own && response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie")!.split(";")[0];
    return { status: response.status, data: await response.json() };
  }
  const parsed = parseQuiz(JSON.stringify([
    { id: "q1", question: "What is 2 + 2?", options: { A: "4", B: "5" }, correctAnswer: "A", explanation: "Two plus two equals four.", topic: "Arithmetic" },
    { id: "q2", question: "What is 3 + 3?", options: { A: "5", B: "6" }, correctAnswer: "B", explanation: "Three plus three equals six." },
  ]), "json");
  assert.ok(parsed.ok);
  const questions = parsed.questions;
  try {
    assert.equal((await request("session")).status, 200);
    assert.ok(cookie, "Browser identity cookie is issued.");
    const created = await request("quizzes", "POST", { title, questions });
    assert.equal(created.status, 201, "Quiz creation succeeds.");
    quiz = created.data.quiz;
    assert.ok(quiz);
    const duplicate = await request("quizzes", "POST", { title, questions: questions.map((q) => ({ ...q, explanation: "Must not overwrite" })) });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.data.created, false);
    assert.ok(sameQuestions(duplicate.data.quiz.questions, questions), "A duplicate name preserves the existing quiz.");
    const otherLibrary = await request("quizzes", "GET", undefined, false);
    assert.equal(otherLibrary.data.visibility, "shared");
    assert.ok(otherLibrary.data.quizzes.some((q: CloudQuiz) => q.id === quiz!.id), "Another visitor sees shared quizzes.");
    assert.equal(otherLibrary.data.quizzes.find((q: CloudQuiz) => q.id === quiz!.id).questions, undefined, "Library responses contain metadata only.");
    const loaded = await request(`quizzes/${quiz.id}`, "GET", undefined, false);
    assert.ok(sameQuestions(loaded.data.quiz.questions, questions));
    const unchanged = await request(`quizzes/${quiz.id}`, "PUT", { title, questions, revision: quiz.revision });
    assert.equal(unchanged.data.quiz.revision, quiz.revision, "Starting an unchanged quiz keeps its revision stable.");
    const changed = questions.map((question, index) => index ? question : { ...question, explanation: "Updated reasoning, saved in Neon." });
    const updated = await request(`quizzes/${quiz.id}`, "PUT", { title, questions: changed, revision: quiz.revision });
    assert.equal(updated.status, 200);
    const oldRevision = quiz.revision;
    quiz = updated.data.quiz;
    assert.ok(quiz);
    assert.equal(quiz.revision, oldRevision + 1);
    assert.equal((await request(`quizzes/${quiz.id}`)).data.quiz.questions[0].explanation, changed[0].explanation);
    assert.equal((await request(`quizzes/${quiz.id}`, "PUT", { title, questions, revision: oldRevision })).status, 409, "Stale edits are rejected.");
    assert.equal((await request(`quizzes/${quiz.id}`, "DELETE", { revision: oldRevision })).status, 409, "Stale deletions are rejected.");
    assert.equal((await request(`quizzes/${quiz.id}`, "PUT", { title, questions })).status, 400);
    assert.equal((await request("quizzes/not-a-uuid")).status, 400);
    assert.equal((await request(`quizzes/${randomUUID()}`)).status, 404);
    assert.equal((await request("quizzes", "POST", { title, questions: [questions[0], { question: "Missing options" }] })).status, 400);
    assert.equal((await request("quizzes", "POST", { title, questions }, true, { Origin: "https://untrusted.example" })).status, 403);
    assert.equal((await request("quizzes", "POST", { title, questions }, true, { "Content-Type": "text/plain" })).status, 415);
    const malformed = await fetch(`${base}/api/quizzes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
    assert.equal(malformed.status, 400);
    const oversized = await fetch(`${base}/api/quizzes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw: "x".repeat(5 * 1024 * 1024) }) });
    assert.equal(oversized.status, 413);
    const attempt = { id: attemptId, quizId: quiz.id, subject: title, questions: changed, answers: { q1: "A", q2: "A" }, elapsedMs: 1234, settings: DEFAULT_SETTINGS, correct: 99 };
    const saved = await request("attempts", "POST", attempt);
    assert.equal(saved.status, 201);
    assert.deepEqual([saved.data.attempt.correct, saved.data.attempt.wrong, saved.data.attempt.skipped], [1, 1, 0], "The server calculates scores.");
    assert.equal((await request("attempts", "POST", attempt)).data.attempt.id, attemptId);
    const history = await request("attempts");
    assert.equal(history.data.attempts.filter((item: CloudAttempt) => item.id === attemptId).length, 1, "Saving twice produces one attempt.");
    assert.equal((await request(`attempts/${attemptId}`, "GET", undefined, false)).status, 404, "Another visitor cannot read private results.");
    assert.ok(!(await request("attempts", "GET", undefined, false)).data.attempts.some((item: CloudAttempt) => item.id === attemptId));
    assert.equal((await request("attempts", "POST", { ...attempt, id: randomUUID(), answers: { q1: "INVALID" } })).status, 400);
    assert.equal((await request(`quizzes/${quiz.id}`, "DELETE", { revision: quiz.revision })).status, 200);
    assert.equal((await request(`quizzes/${quiz.id}`)).status, 404);
    const snapshot = (await request(`attempts/${attemptId}`)).data.attempt;
    assert.equal(snapshot.quizId, null, "Deleting a quiz preserves completed attempts.");
    assert.ok(sameQuestions(snapshot.questions, changed));
    console.log("Live Neon checks passed: quiz CRUD, sharing, revisions, explanations, validation, private history, score calculation and idempotency.");
  } finally {
    if (quiz) {
      const latest = await request(`quizzes/${quiz.id}`);
      if (latest.status === 200) await request(`quizzes/${quiz.id}`, "DELETE", { revision: latest.data.quiz.revision });
    }
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM quizly_attempts WHERE id = ${attemptId} AND subject = ${title}`;
  }
}

void main().catch((error) => {
  console.error(error instanceof assert.AssertionError ? `Integration check failed: ${error.message}` : "Integration checks failed. Check the running app and database configuration.");
  process.exitCode = 1;
});
