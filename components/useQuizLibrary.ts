"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cloud, errorMessage } from "@/lib/cloud";
import type { CloudQuiz, QuizSummary } from "@/lib/cloud-types";

export function useQuizLibrary() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibility, setVisibility] = useState<"shared" | "private">("shared");
  const version = useRef(0);
  const load = useCallback(() => {
    const request = ++version.current;
    return cloud.listQuizzes().then((data) => {
      if (request !== version.current) return;
      setQuizzes(data.quizzes); setVisibility(data.visibility); setError("");
    }).catch((error) => { if (request === version.current) setError(errorMessage(error)); })
      .finally(() => { if (request === version.current) setLoading(false); });
  }, []);
  useEffect(() => { void load(); }, [load]);
  function refresh() { setLoading(true); return load(); }
  function remember(quiz: CloudQuiz) {
    version.current++; setLoading(false); setError("");
    setQuizzes((previous) => [quiz, ...previous.filter((item) => item.id !== quiz.id)]);
  }
  function remove(id: string) { version.current++; setLoading(false); setError(""); setQuizzes((previous) => previous.filter((item) => item.id !== id)); }
  return { quizzes, loading, error, visibility, refresh, remember, remove };
}
