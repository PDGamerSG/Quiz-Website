import { apiError, ApiError, jsonResponse, libraryKey, readBody, validUuid } from "@/lib/server/api";
import { deleteQuiz, getQuiz, updateQuiz } from "@/lib/server/quizzes";
import { object, validateQuiz } from "@/lib/server/validation";

export const runtime = "nodejs";

async function idFrom(context: RouteContext<"/api/quizzes/[id]">) {
  const { id } = await context.params;
  if (!validUuid(id)) throw new ApiError(400, "Invalid quiz ID.");
  return id;
}

export async function GET(_request: Request, context: RouteContext<"/api/quizzes/[id]">) {
  try { return jsonResponse({ quiz: await getQuiz(await libraryKey(), await idFrom(context)) }); }
  catch (error) { return apiError(error); }
}

export async function PUT(request: Request, context: RouteContext<"/api/quizzes/[id]">) {
  try {
    const data = validateQuiz(await readBody(request));
    if (!data.revision) throw new ApiError(400, "Quiz revision is required.");
    return jsonResponse({ quiz: await updateQuiz(await libraryKey(), await idFrom(context), data.revision, data.title, data.questions) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: RouteContext<"/api/quizzes/[id]">) {
  try {
    const data = object(await readBody(request));
    if (!Number.isInteger(data.revision) || Number(data.revision) < 1) throw new ApiError(400, "Quiz revision is required.");
    await deleteQuiz(await libraryKey(), await idFrom(context), Number(data.revision));
    return jsonResponse({ deleted: true });
  } catch (error) { return apiError(error); }
}
