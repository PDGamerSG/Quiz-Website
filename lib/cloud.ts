import type { AttemptSummary, CloudAttempt, CloudQuiz, QuizSummary, SaveAttemptInput, SaveQuizInput } from "./cloud-types";

async function request<T>(path: string, body?: unknown, method = "GET"): Promise<T> {
  try {
    const response = await fetch(`/api/${path}`, {
      method, credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(30000),
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Couldn't complete this request. Please try again.");
    return data as T;
  } catch (error) {
    if (error instanceof Error && !["TypeError", "TimeoutError", "AbortError", "SyntaxError"].includes(error.name)) throw error;
    throw new Error("Couldn't reach quiz storage. Your draft is safe; check your connection and try again.");
  }
}

// Establish the HttpOnly identity before concurrent history requests can create
// different cookies. Retry the handshake after a network failure.
let browserSession: Promise<unknown> | undefined;
async function historyRequest<T>(path: string, body?: unknown, method = "GET") {
  browserSession ??= request("session").catch((error) => { browserSession = undefined; throw error; });
  await browserSession;
  return request<T>(path, body, method);
}

export const cloud = {
  listQuizzes: () => request<{ quizzes: QuizSummary[]; visibility: "shared" | "private" }>("quizzes"),
  getQuiz: (id: string) => request<{ quiz: CloudQuiz }>(`quizzes/${id}`),
  saveQuiz: (input: SaveQuizInput) => request<{ quiz: CloudQuiz; created?: boolean }>(input.id ? `quizzes/${input.id}` : "quizzes", input, input.id ? "PUT" : "POST"),
  deleteQuiz: (quiz: QuizSummary) => request(`quizzes/${quiz.id}`, { revision: quiz.revision }, "DELETE"),
  listAttempts: () => historyRequest<{ attempts: AttemptSummary[] }>("attempts"),
  getAttempt: (id: string) => historyRequest<{ attempt: CloudAttempt }>(`attempts/${id}`),
  saveAttempt: (input: SaveAttemptInput) => historyRequest<{ attempt: AttemptSummary }>("attempts", input, "POST"),
};

export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
