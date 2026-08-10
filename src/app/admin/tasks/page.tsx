import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaskDialog } from "@/components/TaskDialog";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { CalendarView, type CalendarTask } from "@/components/CalendarView";
import {
  buildCalendarWeeks,
  monthLabel,
  parseMonthParam,
  shiftMonthParam,
} from "@/lib/calendar";
import { PRIORITY_LABEL } from "@/lib/taskChip";

const STATUS_COLUMNS: { key: "todo" | "doing" | "done"; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_group_id: string | null;
  parent_task_id: string | null;
  task_assignees: {
    members: { id: string; email: string; full_name: string | null } | null;
  }[];
};

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    view?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const view =
    params.view === "calendar" ? "calendar" : params.view === "list" ? "list" : "board";
  const supabase = await createClient();

  const [{ data: tasks, error: tasksError }, { data: members }, { data: groups }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, assigned_group_id, parent_task_id, task_assignees(members(id, email, full_name))"
        )
        .is("deleted_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .returns<TaskRow[]>(),
      supabase
        .from("members")
        .select("id, email, full_name")
        .neq("status", "disabled")
        .order("email"),
      supabase.from("groups").select("id, name").order("name"),
    ]);

  const memberOptions = members ?? [];
  const groupOptions = groups ?? [];

  // Board only ever shows top-level tasks — subtasks are managed in
  // context, nested under their parent, in the List view. Calendar
  // shows both (a subtask can have its own, different due date), just
  // with each chip aware of the other side of the relationship.
  const topLevelTasks = (tasks ?? []).filter((t) => !t.parent_task_id);
  const subtasksByParent: Record<string, TaskRow[]> = {};
  const tasksById: Record<string, TaskRow> = {};
  for (const task of tasks ?? []) {
    tasksById[task.id] = task;
    if (task.parent_task_id) {
      (subtasksByParent[task.parent_task_id] ??= []).push(task);
    }
  }

  const { year, month } = parseMonthParam(params.month);
  const weeks = view === "calendar" ? buildCalendarWeeks(year, month) : [];
  const tasksByDate: Record<string, CalendarTask[]> = {};
  if (view === "calendar") {
    for (const task of tasks ?? []) {
      if (!task.due_date) continue;
      const parent = task.parent_task_id ? tasksById[task.parent_task_id] : null;
      const subtasks = subtasksByParent[task.id] ?? [];
      const chip: CalendarTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        assignedGroupId: task.assigned_group_id,
        assignees: task.task_assignees
          .map((row) => row.members)
          .filter((m): m is NonNullable<typeof m> => m !== null),
        parentTitle: parent?.title ?? null,
        subtaskSummaries: subtasks.map((s) => ({ title: s.title, dueDate: s.due_date })),
      };
      (tasksByDate[task.due_date] ??= []).push(chip);
    }
  }
  const prevMonthHref = `/admin/tasks?view=calendar&month=${shiftMonthParam(year, month, -1)}`;
  const nextMonthHref = `/admin/tasks?view=calendar&month=${shiftMonthParam(year, month, 1)}`;

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl tracking-wide text-ink uppercase">Tasks</h1>
          <TaskDialog
            triggerLabel="New task"
            heading="New task"
            actionUrl="/admin/tasks/create"
            members={memberOptions}
            groups={groupOptions}
            parentOptions={topLevelTasks.map((task) => ({ id: task.id, title: task.title }))}
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <Link
              href="/admin/tasks?view=board"
              className={
                view === "board"
                  ? "font-medium text-brand"
                  : "text-ink/50 hover:text-brand"
              }
            >
              Board
            </Link>
            <Link
              href="/admin/tasks?view=list"
              className={
                view === "list"
                  ? "font-medium text-brand"
                  : "text-ink/50 hover:text-brand"
              }
            >
              List
            </Link>
            <Link
              href="/admin/tasks?view=calendar"
              className={
                view === "calendar"
                  ? "font-medium text-brand"
                  : "text-ink/50 hover:text-brand"
              }
            >
              Calendar
            </Link>
          </div>

          {view === "calendar" && (
            <div className="flex items-center gap-3 text-sm text-ink/80">
              <Link href={prevMonthHref} aria-label="Previous month" className="hover:text-brand">
                &larr;
              </Link>
              <Link href="/admin/tasks?view=calendar" className="hover:text-brand hover:underline">
                Today
              </Link>
              <span className="font-medium text-ink">{monthLabel(year, month)}</span>
              <Link href={nextMonthHref} aria-label="Next month" className="hover:text-brand">
                &rarr;
              </Link>
            </div>
          )}
        </div>

        {params.error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        )}
        {params.created && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Created &ldquo;{params.created}&rdquo;.
          </p>
        )}
        {params.updated && (
          <p className="mb-4 rounded bg-brand-soft p-3 text-sm text-brand">
            Updated &ldquo;{params.updated}&rdquo;.
          </p>
        )}

        {tasksError ? (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {tasksError.message}
          </p>
        ) : view === "calendar" ? (
          <CalendarView
            weeks={weeks}
            tasksByDate={tasksByDate}
            members={memberOptions}
            groups={groupOptions}
          />
        ) : view === "list" ? (
          <div className="flex flex-col gap-4">
            {topLevelTasks.map((task) => {
              const assignees = task.task_assignees
                .map((row) => row.members)
                .filter((m): m is NonNullable<typeof m> => m !== null);
              const subtasks = subtasksByParent[task.id] ?? [];

              return (
                <div key={task.id} className="rounded border border-cream-dark bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-ink">{task.title}</span>
                    <span className="shrink-0 rounded bg-cream-mid px-2 py-0.5 text-xs text-ink/70">
                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p className="mt-1 text-sm text-ink/70">{task.description}</p>
                  )}

                  {task.due_date && (
                    <p className="mt-1 text-xs text-ink/50">Due {task.due_date}</p>
                  )}

                  {assignees.length > 0 && (
                    <p className="mt-1 text-xs text-ink/50">
                      {assignees.map((a) => a.full_name ?? a.email).join(", ")}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {STATUS_COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                      <form key={c.key} action={`/admin/tasks/${task.id}/status`} method="POST">
                        <input type="hidden" name="status" value={c.key} />
                        <button
                          type="submit"
                          className="rounded border border-cream-dark px-2 py-1 text-xs text-ink/80 hover:bg-cream-mid"
                        >
                          Move to {c.label}
                        </button>
                      </form>
                    ))}

                    <TaskDialog
                      triggerLabel="Edit"
                      heading="Edit task"
                      actionUrl={`/admin/tasks/${task.id}/update`}
                      members={memberOptions}
                      groups={groupOptions}
                      defaultValues={{
                        title: task.title,
                        description: task.description,
                        priority: task.priority,
                        dueDate: task.due_date,
                        memberIds: assignees.map((a) => a.id),
                        groupId: task.assigned_group_id,
                      }}
                      small
                    />

                    <DeleteTaskButton actionUrl={`/admin/tasks/${task.id}/delete`} />
                  </div>

                  <div className="mt-4 border-t border-cream-dark pt-3 pl-4">
                    <p className="mb-2 text-xs font-medium uppercase text-ink/50">
                      Subtasks {subtasks.length > 0 ? `(${subtasks.length})` : ""}
                    </p>

                    <div className="flex flex-col gap-2">
                      {subtasks.map((subtask) => {
                        const subAssignees = subtask.task_assignees
                          .map((row) => row.members)
                          .filter((m): m is NonNullable<typeof m> => m !== null);

                        return (
                          <div
                            key={subtask.id}
                            className="rounded border border-cream-dark p-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-ink">{subtask.title}</span>
                              <span className="shrink-0 rounded bg-cream-mid px-2 py-0.5 text-xs text-ink/70">
                                {PRIORITY_LABEL[subtask.priority] ?? subtask.priority}
                              </span>
                            </div>

                            {subtask.description && (
                              <p className="mt-1 text-ink/70">{subtask.description}</p>
                            )}

                            {subtask.due_date && (
                              <p className="mt-1 text-xs text-ink/50">Due {subtask.due_date}</p>
                            )}

                            {subAssignees.length > 0 && (
                              <p className="mt-1 text-xs text-ink/50">
                                {subAssignees.map((a) => a.full_name ?? a.email).join(", ")}
                              </p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {STATUS_COLUMNS.filter((c) => c.key !== subtask.status).map((c) => (
                                <form
                                  key={c.key}
                                  action={`/admin/tasks/${subtask.id}/status`}
                                  method="POST"
                                >
                                  <input type="hidden" name="status" value={c.key} />
                                  <button
                                    type="submit"
                                    className="rounded border border-cream-dark px-2 py-1 text-xs text-ink/80 hover:bg-cream-mid"
                                  >
                                    Move to {c.label}
                                  </button>
                                </form>
                              ))}

                              <TaskDialog
                                triggerLabel="Edit"
                                heading="Edit subtask"
                                actionUrl={`/admin/tasks/${subtask.id}/update`}
                                members={memberOptions}
                                groups={groupOptions}
                                defaultValues={{
                                  title: subtask.title,
                                  description: subtask.description,
                                  priority: subtask.priority,
                                  dueDate: subtask.due_date,
                                  memberIds: subAssignees.map((a) => a.id),
                                  groupId: subtask.assigned_group_id,
                                }}
                                small
                              />

                              <DeleteTaskButton actionUrl={`/admin/tasks/${subtask.id}/delete`} />
                            </div>
                          </div>
                        );
                      })}

                      {subtasks.length === 0 && (
                        <p className="text-xs text-ink/50">No subtasks yet.</p>
                      )}

                      <TaskDialog
                        triggerLabel="+ Add subtask"
                        heading={`New subtask on "${task.title}"`}
                        actionUrl="/admin/tasks/create"
                        members={memberOptions}
                        groups={groupOptions}
                        parentTaskId={task.id}
                        small
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {topLevelTasks.length === 0 && (
              <p className="text-center text-sm text-ink/50">No tasks.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {STATUS_COLUMNS.map((column) => {
              const columnTasks = (tasks ?? []).filter((t) => t.status === column.key);
              return (
                <div
                  key={column.key}
                  className="rounded border border-cream-dark bg-white"
                >
                  <div className="border-b border-cream-dark px-4 py-3 text-sm font-medium text-ink/80">
                    {column.label} ({columnTasks.length})
                  </div>
                  <div className="flex flex-col gap-3 p-3">
                    {columnTasks.map((task) => {
                      const assignees = task.task_assignees
                        .map((row) => row.members)
                        .filter((m): m is NonNullable<typeof m> => m !== null);
                      const parent = task.parent_task_id ? tasksById[task.parent_task_id] : null;
                      const subtasks = subtasksByParent[task.id] ?? [];

                      return (
                        <div
                          key={task.id}
                          className="rounded border border-cream-dark p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-ink">
                              {parent && <span className="text-ink/40">&#8618; </span>}
                              {task.title}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              {parent && (
                                <span className="rounded bg-cream-mid px-2 py-0.5 text-xs text-ink/50">
                                  Task: {parent.title}
                                </span>
                              )}
                              <span className="rounded bg-cream-mid px-2 py-0.5 text-xs text-ink/70">
                                {PRIORITY_LABEL[task.priority] ?? task.priority}
                              </span>
                            </div>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-ink/70">{task.description}</p>
                          )}

                          {subtasks.length > 0 && (
                            <p className="mt-1 text-xs text-ink/50">
                              Subtasks: {subtasks.map((s) => s.title).join(", ")}
                            </p>
                          )}

                          {task.due_date && (
                            <p className="mt-1 text-xs text-ink/50">Due {task.due_date}</p>
                          )}

                          {assignees.length > 0 && (
                            <p className="mt-1 text-xs text-ink/50">
                              {assignees.map((a) => a.full_name ?? a.email).join(", ")}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {STATUS_COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                              <form
                                key={c.key}
                                action={`/admin/tasks/${task.id}/status`}
                                method="POST"
                              >
                                <input type="hidden" name="status" value={c.key} />
                                <button
                                  type="submit"
                                  className="rounded border border-cream-dark px-2 py-1 text-xs text-ink/80 hover:bg-cream-mid"
                                >
                                  Move to {c.label}
                                </button>
                              </form>
                            ))}

                            <TaskDialog
                              triggerLabel="Edit"
                              heading="Edit task"
                              actionUrl={`/admin/tasks/${task.id}/update`}
                              members={memberOptions}
                              groups={groupOptions}
                              defaultValues={{
                                title: task.title,
                                description: task.description,
                                priority: task.priority,
                                dueDate: task.due_date,
                                memberIds: assignees.map((a) => a.id),
                                groupId: task.assigned_group_id,
                              }}
                              small
                            />

                            <DeleteTaskButton actionUrl={`/admin/tasks/${task.id}/delete`} />
                          </div>
                        </div>
                      );
                    })}
                    {columnTasks.length === 0 && (
                      <p className="px-1 py-4 text-center text-xs text-ink/50">
                        No tasks.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
