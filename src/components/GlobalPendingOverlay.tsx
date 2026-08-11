"use client";

import { useEffect, useRef, useState } from "react";

// Covers the whole screen (blocking further clicks) the moment any form on
// the page actually submits, so a slow save reads as "working" instead of
// "broken" — the #1 cause of people clicking Save/Move/Delete repeatedly.
//
// This has to be a native <dialog> shown via showModal(), not a plain
// positioned <div> — showModal() renders in the browser's "top layer",
// which sits above the entire regular document (including any other open
// <dialog>, like TaskDialog's edit form) regardless of z-index. A plain
// div can never draw on top of an open modal dialog; only another modal
// dialog can.
//
// Plain forms (status buttons, delete buttons, etc.) need no changes at
// all: the browser's native "submit" event bubbles up to this listener by
// itself. Forms that intercept submission with their own JS (TaskDialog's
// confirm-before-save) dispatch a manual "app:pending" event instead, once
// they're done with their own logic and are about to actually submit.
// Client-side actions that never navigate away (calendar drag-and-drop)
// dispatch "app:pending:done" to hide it again once finished.
export function GlobalPendingOverlay() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function handleSubmit(event: Event) {
      if ((event as SubmitEvent).defaultPrevented) return;
      setPending(true);
    }
    function show() {
      setPending(true);
    }
    function hide() {
      setPending(false);
    }

    document.addEventListener("submit", handleSubmit);
    document.addEventListener("app:pending", show);
    document.addEventListener("app:pending:done", hide);
    return () => {
      document.removeEventListener("submit", handleSubmit);
      document.removeEventListener("app:pending", show);
      document.removeEventListener("app:pending:done", hide);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pending && !dialog.open) {
      dialog.showModal();
    } else if (!pending && dialog.open) {
      dialog.close();
    }
  }, [pending]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed top-1/2 left-1/2 m-0 -translate-x-1/2 -translate-y-1/2 border-none bg-transparent p-0 backdrop:bg-ink/30"
    >
      <div className="flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-xl">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <span className="text-sm font-medium text-ink">Saving…</span>
      </div>
    </dialog>
  );
}
