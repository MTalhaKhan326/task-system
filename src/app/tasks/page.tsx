import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
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
  parent_task_id: string | null;
  task_comments: {
    id: string;
    body: string;
    created_at: string;
    members: { full_name: string | null; email: string } | null;
  }[];
};

export default async function MemberTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/tasks");
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_date, parent_task_id, task_comments(id, body, created_at, members(full_name, email))"
    )
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<TaskRow[]>();

  // Scoped to whatever this member can actually see under RLS (their own
  // assigned tasks) — a parent or subtask only shows up here if it's also
  // separately assigned to this member.
  const tasksById: Record<string, TaskRow> = {};
  const subtasksByParent: Record<string, TaskRow[]> = {};
  for (const task of tasks ?? []) {
    tasksById[task.id] = task;
    if (task.parent_task_id) {
      (subtasksByParent[task.parent_task_id] ??= []).push(task);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 font-display text-3xl tracking-wide text-ink uppercase">My tasks</h1>

        {params.error && (
          <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {params.error}
          </p>
        )}

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error.message}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {(tasks ?? []).map((task) => {
              const parent = task.parent_task_id ? tasksById[task.parent_task_id] : null;
              const subtasks = subtasksByParent[task.id] ?? [];

              return (
              <div
                key={task.id}
                className="rounded border border-cream-dark bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-ink">
                    {parent && <span className="text-ink/40">&#8618; </span>}
                    {task.title}
                  </h2>
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
                  <p className="mt-1 text-sm text-ink/70">{task.description}</p>
                )}

                {subtasks.length > 0 && (
                  <p className="mt-1 text-xs text-ink/50">
                    Subtasks: {subtasks.map((s) => s.title).join(", ")}
                  </p>
                )}

                {task.due_date && (
                  <p className="mt-1 text-xs text-ink/50">Due {task.due_date}</p>
                )}

                <form
                  action={`/tasks/${task.id}/status`}
                  method="POST"
                  className="mt-3 flex items-center gap-2"
                >
                  <select
                    name="status"
                    defaultValue={task.status}
                    className="rounded border border-cream-dark px-2 py-1 text-sm text-ink"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded border border-cream-dark px-3 py-1 text-sm text-ink/80 hover:bg-cream-mid"
                  >
                    Update status
                  </button>
                </form>

                <div className="mt-4 border-t border-cream-dark pt-3">
                  <h3 className="mb-2 text-xs font-medium uppercase text-ink/50">
                    Comments
                  </h3>
                  <div className="mb-3 flex flex-col gap-2">
                    {task.task_comments.length === 0 && (
                      <p className="text-xs text-ink/50">No comments yet.</p>
                    )}
                    {task.task_comments.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <span className="font-medium text-ink/80">
                          {comment.members?.full_name ?? comment.members?.email ?? "Unknown"}
                        </span>{" "}
                        <span className="text-xs text-ink/50">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                        <p className="text-ink/80">{comment.body}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    action={`/tasks/${task.id}/comments`}
                    method="POST"
                    className="flex gap-2"
                  >
                    <textarea
                      name="body"
                      required
                      rows={2}
                      placeholder="Add a comment"
                      className="flex-1 rounded border border-cream-dark px-2 py-1 text-sm text-ink"
                    />
                    <button
                      type="submit"
                      className="self-end rounded border border-cream-dark px-3 py-1 text-sm text-ink/80 hover:bg-cream-mid"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>
              );
            })}
            {(tasks ?? []).length === 0 && (
              <p className="text-center text-sm text-ink/50">
                No tasks assigned to you.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
