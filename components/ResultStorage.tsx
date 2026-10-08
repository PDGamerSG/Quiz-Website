"use client";

import { useCallback, useEffect, useState } from "react";
import type { SaveAttemptInput } from "@/lib/cloud-types";
import { errorMessage } from "@/lib/cloud";
import { queueAttempt, savePendingAttempt } from "@/lib/pending-attempts";
import { Button } from "./ui";

export function ResultStorage({ attempt }: { attempt: SaveAttemptInput }) {
  const [status, setStatus] = useState<"saving" | "saved" | "error">("saving");
  const [error, setError] = useState("");
  const save = useCallback(() => {
    const queued = queueAttempt(attempt);
    return savePendingAttempt(attempt).then(() => setStatus("saved")).catch((error) => {
      setStatus("error");
      setError(`${errorMessage(error)} ${queued ? "This result is kept on this device for retry." : "Download your results to keep a backup; browser storage is full or unavailable."}`);
    });
  }, [attempt]);
  useEffect(() => { void save(); }, [save]);
  return <div className="mt-4 text-center text-xs">
    <p role={status === "error" ? "alert" : "status"} className={status === "error" ? "text-danger" : "text-muted-foreground"}>{status === "saving" ? "saving your result…" : status === "saved" ? "saved to your private result history" : error}</p>
    {status === "error" && <Button type="button" variant="glass" className="mt-2 text-xs" onClick={() => { setStatus("saving"); void save(); }}>retry saving result</Button>}
  </div>;
}
