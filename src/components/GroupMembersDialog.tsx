"use client";

import { useRef } from "react";

type MemberOption = { id: string; email: string; full_name: string | null };

type GroupMembersDialogProps = {
  actionUrl: string;
  members: MemberOption[];
  currentMemberIds: string[];
};

export function GroupMembersDialog({
  actionUrl,
  members,
  currentMemberIds,
}: GroupMembersDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        Manage members
      </button>

      <dialog
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-0 text-black backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <form action={actionUrl} method="POST" className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">Manage members</h2>

          <div className="max-h-60 overflow-y-auto rounded border border-zinc-200 p-3 dark:border-zinc-800">
            {members.length === 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-500">No members yet.</p>
            )}
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2 py-0.5 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <input
                  type="checkbox"
                  name="memberIds"
                  value={member.id}
                  defaultChecked={currentMemberIds.includes(member.id)}
                />
                {member.full_name ?? member.email}
              </label>
            ))}
          </div>

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
