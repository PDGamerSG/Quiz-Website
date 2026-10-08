// Retry transport failures only. Database responses (including validation and
// revision conflicts) are returned immediately to the caller.
export async function databaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try { return await fetch(input, init); }
    catch (error) {
      if (attempt >= 2 || init?.signal?.aborted) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}
