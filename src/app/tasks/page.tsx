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
    redirect("/login");
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_date, task_comments(id, body, created_at, members(full_name, email))"
    )
    .is("deleted_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .returns<TaskRow[]>();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-black dark:text-zinc-50">
          My tasks
        </h1>

        {params.error && (
          <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {params.error}
          </p>
        )}

        {error ? (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error.message}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {(tasks ?? []).map((task) => (
              <div
                key={task.id}
                className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-black dark:text-zinc-50">{task.title}</h2>
                  <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    {PRIORITY_LABEL[task.priority] ?? task.priority}
                  </span>
                </div>

                {task.description && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {task.description}
                  </p>
                )}

                {task.due_date && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                    Due {task.due_date}
                  </p>
                )}

                <form
                  action={`/tasks/${task.id}/status`}
                  method="POST"
                  className="mt-3 flex items-center gap-2"
                >
                  <select
                    name="status"
                    defaultValue={task.status}
                    className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Update status
                  </button>
                </form>

                <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <h3 className="mb-2 text-xs font-medium uppercase text-zinc-500 dark:text-zinc-500">
                    Comments
                  </h3>
                  <div className="mb-3 flex flex-col gap-2">
                    {task.task_comments.length === 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        No comments yet.
                      </p>
                    )}
                    {task.task_comments.map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {comment.members?.full_name ?? comment.members?.email ?? "Unknown"}
                        </span>{" "}
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                        <p className="text-zinc-700 dark:text-zinc-300">{comment.body}</p>
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
                      className="flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button
                      type="submit"
                      className="self-end rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {(tasks ?? []).length === 0 && (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
                No tasks assigned to you.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
