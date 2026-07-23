import { createClient } from "@/lib/supabase/server";
import { TaskDialog } from "@/components/TaskDialog";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";

const STATUS_COLUMNS: { key: "todo" | "doing" | "done"; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_group_id: string | null;
  task_assignees: {
    members: { id: string; email: string; full_name: string | null } | null;
  }[];
};

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: tasks, error: tasksError }, { data: members }, { data: groups }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, assigned_group_id, task_assignees(members(id, email, full_name))"
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

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Tasks</h1>
          <TaskDialog
            triggerLabel="New task"
            heading="New task"
            actionUrl="/admin/tasks/create"
            members={memberOptions}
            groups={groupOptions}
          />
        </div>

        {params.error && (
          <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {params.error}
          </p>
        )}
        {params.created && (
          <p className="mb-4 rounded bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Created &ldquo;{params.created}&rdquo;.
          </p>
        )}
        {params.updated && (
          <p className="mb-4 rounded bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Updated &ldquo;{params.updated}&rdquo;.
          </p>
        )}

        {tasksError ? (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {tasksError.message}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {STATUS_COLUMNS.map((column) => {
              const columnTasks = (tasks ?? []).filter((t) => t.status === column.key);
              return (
                <div
                  key={column.key}
                  className="rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                    {column.label} ({columnTasks.length})
                  </div>
                  <div className="flex flex-col gap-3 p-3">
                    {columnTasks.map((task) => {
                      const assignees = task.task_assignees
                        .map((row) => row.members)
                        .filter((m): m is NonNullable<typeof m> => m !== null);

                      return (
                        <div
                          key={task.id}
                          className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-black dark:text-zinc-50">
                              {task.title}
                            </span>
                            <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                              {PRIORITY_LABEL[task.priority] ?? task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                              {task.description}
                            </p>
                          )}

                          {task.due_date && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                              Due {task.due_date}
                            </p>
                          )}

                          {assignees.length > 0 && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
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
                                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
                      <p className="px-1 py-4 text-center text-xs text-zinc-500 dark:text-zinc-500">
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
