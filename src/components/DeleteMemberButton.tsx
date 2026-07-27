"use client";

export function DeleteMemberButton({ actionUrl }: { actionUrl: string }) {
  return (
    <form
      action={actionUrl}
      method="POST"
      onSubmit={(event) => {
        if (
          !confirm(
            "Delete this member? They lose access immediately, but their task history and comments are kept."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </form>
  );
}
