import { cloud } from "./cloud";
import type { SaveAttemptInput } from "./cloud-types";
import { readStored, writeStored } from "./storage";

const KEY = "quizly:pending-attempts:v1";
export function pendingAttempts(): SaveAttemptInput[] {
  const data = readStored(KEY);
  return Array.isArray(data) ? data.filter((item) => item && typeof item.id === "string" && Array.isArray(item.questions)) : [];
}
export function queueAttempt(attempt: SaveAttemptInput) {
  return writeStored(KEY, [...pendingAttempts().filter((item) => item.id !== attempt.id), attempt]);
}
export async function savePendingAttempt(attempt: SaveAttemptInput) {
  await cloud.saveAttempt(attempt);
  writeStored(KEY, pendingAttempts().filter((item) => item.id !== attempt.id));
}
export async function syncPendingAttempts() {
  for (const attempt of pendingAttempts()) await savePendingAttempt(attempt);
}
