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
        className="rounded border border-cream-dark px-2 py-1 text-xs text-ink/80 hover:bg-cream-mid"
      >
        Manage members
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
        className="fixed top-1/2 left-1/2 m-0 max-h-[85vh] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-cream-dark bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form action={actionUrl} method="POST" className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Manage members</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="text-xl leading-none text-ink/40 hover:text-ink/70"
            >
              &times;
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto rounded border border-cream-dark p-3">
            {members.length === 0 && (
              <p className="text-xs text-ink/50">No members yet.</p>
            )}
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-2 py-0.5 text-sm text-ink/80"
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
              className="rounded border border-cream-dark px-4 py-2 text-sm text-ink/80 hover:bg-cream-mid"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-brand px-5 py-2 text-sm text-white transition-colors hover:bg-brand-dark"
            >
              Save
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
