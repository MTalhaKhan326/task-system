"use client";

import { useRef } from "react";

type GroupDialogProps = {
  triggerLabel: string;
  heading: string;
  actionUrl: string;
  defaultValues?: { name?: string };
  small?: boolean;
};

export function GroupDialog({
  triggerLabel,
  heading,
  actionUrl,
  defaultValues,
  small,
}: GroupDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          small
            ? "rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            : "rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        }
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-0 text-black backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <form action={actionUrl} method="POST" className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">{heading}</h2>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Name
            <input
              type="text"
              name="name"
              required
              defaultValue={defaultValues?.name}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Save
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
