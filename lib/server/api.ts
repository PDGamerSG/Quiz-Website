import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { MAX_IMPORT_BYTES } from "../quiz";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function visibility() { return process.env.QUIZ_LIBRARY_VISIBILITY === "private" ? "private" : "shared"; }

export async function ownerKey() {
  const jar = await cookies();
  let token = jar.get("quizly-library")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString("hex");
    jar.set("quizly-library", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return createHash("sha256").update(token).digest("hex");
}

export async function libraryKey() { return visibility() === "shared" ? "shared" : ownerKey(); }

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new ApiError(403, "This request must come from the quiz website.");
  }
}

export async function readBody(request: Request): Promise<unknown> {
  assertSameOrigin(request);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "Send quiz data as JSON.");
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_IMPORT_BYTES) throw new ApiError(413, "Quiz data must be smaller than 5 MB.");
  // Stream with a byte limit, including requests without Content-Length.
  if (!request.body) throw new ApiError(400, "Request data is missing.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMPORT_BYTES) { await reader.cancel(); throw new ApiError(413, "Quiz data must be smaller than 5 MB."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError(400, "Request data must be valid JSON."); }
}

export function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function jsonResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return jsonResponse({ error: error.message }, error.status);
  // Database errors can contain connection details; never serialize or log them.
  if (error && typeof error === "object" && "code" in error && error.code === "23505") return jsonResponse({ error: "A quiz with that name already exists. Choose another name or open the saved quiz." }, 409);
  return jsonResponse({ error: "Database storage is temporarily unavailable. Your draft is safe; please try again." }, 503);
}
