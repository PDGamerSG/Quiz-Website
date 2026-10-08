"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { cloud, errorMessage } from "@/lib/cloud";
import type { AttemptSummary, CloudAttempt } from "@/lib/cloud-types";
import { pendingAttempts, syncPendingAttempts } from "@/lib/pending-attempts";
import { formatDuration } from "@/lib/utils";
import { Button } from "./ui";

export function AttemptHistory({ onReview, disabled }: { onReview: (attempt: CloudAttempt) => void; disabled: boolean }) {
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(() => pendingAttempts().length);
  const load = useCallback((sync = false) => {
    const request = sync ? syncPendingAttempts().then(() => cloud.listAttempts()) : cloud.listAttempts();
    return request.then((data) => { setAttempts(data.attempts); setError(""); })
      .catch((error) => setError(errorMessage(error)))
      .finally(() => { setLoading(false); setPending(pendingAttempts().length); });
  }, []);
  useEffect(() => { void load(); }, [load]);
  function refresh(sync = false) { setLoading(true); setError(""); return load(sync); }
  async function open(id: string) {
    setOpening(true); setError("");
    try { onReview((await cloud.getAttempt(id)).attempt); }
    catch (error) { setError(errorMessage(error)); }
    finally { setOpening(false); }
  }
  return <section aria-labelledby="history-heading" className="mt-10" aria-busy={loading || opening}>
    <div className="flex items-center gap-2"><History className="h-4 w-4 text-accent" /><h2 id="history-heading" className="text-sm font-medium">your result history</h2><Button type="button" variant="ghost" disabled={loading || opening || disabled} onClick={() => void refresh()} className="ml-auto h-10 px-3 text-xs"><RefreshCw className="h-3.5 w-3.5" />refresh</Button></div>
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your latest 100 completed attempts, private to this browser. Clearing cookies removes access to this history.</p>
    {pending > 0 && <div className="mt-3"><p className="text-xs text-muted-foreground">{pending} results on this device are waiting to save.</p><Button type="button" variant="glass" className="mt-2 text-xs" disabled={loading || disabled} onClick={() => void refresh(true)}>retry saving results</Button></div>}
    {loading && <p role="status" className="mt-3 text-xs text-muted-foreground">loading result history…</p>}
    {opening && <p role="status" className="mt-3 text-xs text-muted-foreground">opening result…</p>}
    {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
    {!loading && !error && !attempts.length && <p className="mt-3 text-xs text-muted-foreground">Finish a quiz to save your first result.</p>}
    {attempts.length > 0 && <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">{attempts.map((attempt) => <li key={attempt.id}><button type="button" disabled={disabled || opening} onClick={() => void open(attempt.id)} className="flex w-full items-center gap-4 py-4 text-left disabled:opacity-50"><span className="min-w-0 flex-1"><span className="block truncate text-sm">{attempt.subject}</span><span className="mt-1 block text-xs text-muted-foreground">{new Date(attempt.completedAt).toLocaleString()} · {formatDuration(attempt.elapsedMs)} · review answers</span></span><span className="shrink-0 text-sm text-accent">{attempt.correct}/{attempt.questionCount}</span></button></li>)}</ul>}
  </section>;
}
