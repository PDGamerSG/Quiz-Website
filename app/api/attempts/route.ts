import { apiError, jsonResponse, libraryKey, ownerKey, readBody } from "@/lib/server/api";
import { listAttempts, saveAttempt } from "@/lib/server/attempts";
import { validateAttempt } from "@/lib/server/validation";

export const runtime = "nodejs";
export async function GET() {
  try { return jsonResponse({ attempts: await listAttempts(await ownerKey()) }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const attempt = validateAttempt(await readBody(request));
    const owner = await ownerKey();
    return jsonResponse({ attempt: await saveAttempt(owner, await libraryKey(), attempt) }, 201);
  } catch (error) { return apiError(error); }
}
