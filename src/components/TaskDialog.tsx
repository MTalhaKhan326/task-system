"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

type MemberOption = { id: string; email: string; full_name: string | null };
type GroupOption = { id: string; name: string };
type ParentTaskOption = { id: string; title: string };

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
  // Fixed parent — used by the "+ Add subtask" buttons, already scoped to
  // one specific task.
  parentTaskId?: string;
  // A pickable list of parent tasks — used by the general "New task"
  // button, where the user chooses at creation time whether this becomes
  // a subtask (pick one) or a new top-level task (leave as "None").
  parentOptions?: ParentTaskOption[];
  small?: boolean;
  // When set, no button is rendered — the caller opens the dialog
  // itself via the forwarded ref's open() method. Used by the
  // calendar, where clicking the task chip itself opens the edit
  // dialog rather than a separate visible button.
  hideTrigger?: boolean;
};

export type TaskDialogHandle = { open: () => void };

export const TaskDialog = forwardRef<TaskDialogHandle, TaskDialogProps>(function TaskDialog(
  {
    triggerLabel,
    heading,
    actionUrl,
    members,
    groups,
    defaultValues,
    parentTaskId,
    parentOptions,
    small,
    hideTrigger,
  },
  ref
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const notifyInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(defaultValues);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal(),
  }));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sendEmail = window.confirm(
      isEdit
        ? "Send an email notification about this change?"
        : "Send an email notification to the people assigned to this task?"
    );
    if (notifyInputRef.current) {
      notifyInputRef.current.value = sendEmail ? "true" : "false";
    }
    // This submit() call bypasses the browser's native "submit" event
    // entirely, so the global loading overlay (GlobalPendingOverlay) can't
    // see it on its own — signal it manually instead.
    document.dispatchEvent(new Event("app:pending"));
    // Give the browser a paint frame to actually show that overlay before
    // navigating away — calling submit() synchronously in the same tick
    // as the state update can start the page unload before it ever
    // renders, so the loader silently never appears.
    requestAnimationFrame(() => {
      // Native submit — bypasses this handler (no infinite loop) and is
      // safe since built-in validation already passed before onSubmit
      // ever fired.
      formRef.current?.submit();
    });
  }

  return (
    <>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className={
            small
              ? "rounded border border-cream-dark px-2 py-1 text-xs text-ink/80 hover:bg-cream-mid"
              : "rounded-full bg-brand px-5 py-2 text-sm text-white transition-colors hover:bg-brand-dark"
          }
        >
          {triggerLabel}
        </button>
      )}

      <dialog
        ref={dialogRef}
         onClick={(event) => {
          event.stopPropagation();
          if (event.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
        className="fixed top-1/2 left-1/2 m-0 max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-cream-dark bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form
          ref={formRef}
          action={actionUrl}
          method="POST"
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 p-6"
        >
          {parentTaskId && <input type="hidden" name="parentTaskId" value={parentTaskId} />}
          <input type="hidden" name="notify" ref={notifyInputRef} defaultValue="true" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{heading}</h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="text-xl leading-none text-ink/40 hover:text-ink/70"
            >
              &times;
            </button>
          </div>

          {parentOptions && (
            <label className="flex flex-col gap-1 text-sm text-ink/80">
              Subtask of
              <select
                name="parentTaskId"
                defaultValue=""
                className="rounded border border-cream-dark px-3 py-2"
              >
                <option value="">None — create as a new task</option>
                {parentOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Title
            <input
              type="text"
              name="title"
              required
              defaultValue={defaultValues?.title}
              className="rounded border border-cream-dark px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/80">
            Description
            <textarea
              name="description"
              defaultValue={defaultValues?.description ?? ""}
              rows={3}
              className="rounded border border-cream-dark px-3 py-2"
            />
          </label>

          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-sm text-ink/80">
              Priority
              <select
                name="priority"
                defaultValue={defaultValues?.priority ?? "medium"}
                className="rounded border border-cream-dark px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="flex flex-1 flex-col gap-1 text-sm text-ink/80">
              Due date
              <input
                type="date"
                name="dueDate"
                defaultValue={defaultValues?.dueDate ?? ""}
                className="rounded border border-cream-dark px-3 py-2"
              />
            </label>
          </div>

          <fieldset className="rounded border border-cream-dark p-3">
            <legend className="px-1 text-sm text-ink/80">Assign to</legend>
            <div className="max-h-72 overflow-y-auto">
              {members.length === 0 && groups.length === 0 && (
                <p className="text-xs text-ink/50">No members or groups yet.</p>
              )}

              {groups.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium uppercase text-ink/50">
                    Groups
                  </p>
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 py-0.5 text-sm text-ink/80"
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
                  <p className="mb-1 text-xs font-medium uppercase text-ink/50">
                    Members
                  </p>
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 py-0.5 text-sm text-ink/80"
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
});
