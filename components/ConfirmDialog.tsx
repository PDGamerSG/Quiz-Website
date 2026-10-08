"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./ui";

export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: {
  title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={dialogRef} aria-labelledby="confirm-title" aria-describedby="confirm-description"
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-white/15 bg-card p-6 text-foreground shadow-xl backdrop:bg-black/75 backdrop:backdrop-blur-sm anim-pop-in">
      <h2 id="confirm-title" className="text-base font-medium">{title}</h2>
      <div id="confirm-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      <div className="mt-6 flex gap-3">
        <Button type="button" variant="glass" className="flex-1" onClick={onCancel} autoFocus>keep going</Button>
        <Button type="button" className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </dialog>
  );
}
