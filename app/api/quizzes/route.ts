import { apiError, jsonResponse, libraryKey, readBody, visibility } from "@/lib/server/api";
import { createQuiz, listQuizzes } from "@/lib/server/quizzes";
import { validateQuiz } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function GET() {
  try { return jsonResponse({ quizzes: await listQuizzes(await libraryKey()), visibility: visibility() }); }
  catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const { title, questions } = validateQuiz(await readBody(request));
    const result = await createQuiz(await libraryKey(), title, questions);
    return jsonResponse(result, result.created ? 201 : 200);
  } catch (error) { return apiError(error); }
}
