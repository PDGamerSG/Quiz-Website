import { apiError, jsonResponse, ownerKey } from "@/lib/server/api";

export const runtime = "nodejs";
export async function GET() {
  try {
    await ownerKey();
    return jsonResponse({ ready: true });
  } catch (error) { return apiError(error); }
}
