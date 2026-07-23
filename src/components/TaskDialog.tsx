"use client";

import { useRef } from "react";

type MemberOption = { id: string; email: string; full_name: string | null };
type GroupOption = { id: string; name: string };

type TaskDialogProps = {
  triggerLabel: string;
  heading: string;
  actionUrl: string;
  members: MemberOption[];
  groups: GroupOption[];
  defaultValues?: {
    title?: string;
    description?: string | null;
    priority?: string;
    dueDate?: string | null;
    memberIds?: string[];
    groupId?: string | null;
  };
  small?: boolean;
};

export function TaskDialog({
  triggerLabel,
  heading,
  actionUrl,
  members,
  groups,
  defaultValues,
  small,
}: TaskDialogProps) {
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
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-0 text-black backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <form action={actionUrl} method="POST" className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">{heading}</h2>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Title
            <input
              type="text"
              name="title"
              required
              defaultValue={defaultValues?.title}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Description
            <textarea
              name="description"
              defaultValue={defaultValues?.description ?? ""}
              rows={3}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <div className="flex gap-4">
            <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Priority
              <select
                name="priority"
                defaultValue={defaultValues?.priority ?? "medium"}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Due date
              <input
                type="date"
                name="dueDate"
                defaultValue={defaultValues?.dueDate ?? ""}
                className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>

          <fieldset className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <legend className="px-1 text-sm text-zinc-700 dark:text-zinc-300">Assign to</legend>
            <div className="max-h-40 overflow-y-auto">
              {members.length === 0 && groups.length === 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  No members or groups yet.
                </p>
              )}

              {groups.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-500">
                    Groups
                  </p>
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 py-0.5 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        name="groupIds"
                        value={group.id}
                        defaultChecked={defaultValues?.groupId === group.id}
                      />
                      {group.name}
                    </label>
                  ))}
                </div>
              )}

              {members.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-500">
                    Members
                  </p>
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 py-0.5 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        name="memberIds"
                        value={member.id}
                        defaultChecked={defaultValues?.memberIds?.includes(member.id)}
                      />
                      {member.full_name ?? member.email}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </fieldset>

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
