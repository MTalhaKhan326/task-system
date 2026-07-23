"use client";

export function DeleteTaskButton({ actionUrl }: { actionUrl: string }) {
  return (
    <form
      action={actionUrl}
      method="POST"
      onSubmit={(event) => {
        if (!confirm("Delete this task?")) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
      >
        Delete
      </button>
    </form>
  );
}
