import { apiError, ApiError, jsonResponse, ownerKey, validUuid } from "@/lib/server/api";
import { getAttempt } from "@/lib/server/attempts";

export const runtime = "nodejs";
export async function GET(_request: Request, context: RouteContext<"/api/attempts/[id]">) {
  try {
    const { id } = await context.params;
    if (!validUuid(id)) throw new ApiError(400, "Invalid attempt ID.");
    return jsonResponse({ attempt: await getAttempt(await ownerKey(), id) });
  } catch (error) { return apiError(error); }
}
