import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TaskDialog } from "@/components/TaskDialog";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import {
  buildCalendarWeeks,
  monthLabel,
  parseMonthParam,
  shiftMonthParam,
} from "@/lib/calendar";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_COLUMNS: { key: "todo" | "doing" | "done"; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_COLUMNS.map((c) => [c.key, c.label])
);

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// Distinct-ish brand tones so different people's avatar circles are
// easy to tell apart at a glance, without introducing an off-brand
// palette. brand-light is excluded — too pale for white text contrast.
const AVATAR_COLORS = ["bg-brand", "bg-brand-dark", "bg-ink"];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && fullName) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

// done tasks are faded/dimmed rather than literally blurred — an actual
// CSS blur would make the title unreadable, which defeats the point.
function calendarChipClasses(status: string): string {
  if (status === "done") {
    return "bg-cream-mid text-ink/40 opacity-60";
  }
  if (status === "doing") {
    return "bg-brand-soft text-brand ring-1 ring-brand-light";
  }
  return "bg-cream-mid text-ink/80";
}

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
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    view?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const view = params.view === "calendar" ? "calendar" : "board";
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

  const { year, month } = parseMonthParam(params.month);
  const weeks = view === "calendar" ? buildCalendarWeeks(year, month) : [];
  const tasksByDate = new Map<string, TaskRow[]>();
  if (view === "calendar") {
    for (const task of tasks ?? []) {
      if (!task.due_date) continue;
      const existing = tasksByDate.get(task.due_date);
      if (existing) {
        existing.push(task);
      } else {
        tasksByDate.set(task.due_date, [task]);
      }
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
          <div className="rounded border border-cream-dark">
            <div className="grid grid-cols-7 gap-px bg-cream-dark">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="bg-cream-mid px-2 py-1 text-center text-xs font-medium text-ink/70"
                >
                  {label}
                </div>
              ))}
              {weeks.flatMap((week) =>
                week.map((day) => (
                  <div
                    key={day.dateKey}
                    className={`min-h-28 bg-white p-1.5 ${day.inMonth ? "" : "opacity-40"}`}
                  >
                    <div className="mb-1 text-xs text-ink/50">{day.dayOfMonth}</div>
                    <div className="flex flex-col gap-1">
                      {(tasksByDate.get(day.dateKey) ?? []).map((task) => {
                        const assignees = task.task_assignees
                          .map((row) => row.members)
                          .filter((m): m is NonNullable<typeof m> => m !== null);
                        const shown = assignees.slice(0, 2);

                        return (
                          <div key={task.id} className="group relative">
                            <div
                              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${calendarChipClasses(
                                task.status
                              )}`}
                            >
                              {shown.length > 0 && (
                                <div className="flex shrink-0 -space-x-1">
                                  {shown.map((a) => (
                                    <span
                                      key={a.id}
                                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-medium text-white ring-1 ring-white ${avatarColor(
                                        a.id
                                      )}`}
                                    >
                                      {initials(a.full_name, a.email)}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <span className="truncate">{task.title}</span>
                            </div>

                            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-lg border border-cream-dark bg-white p-3 text-left text-xs opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                              <p className="mb-1 font-medium text-ink">{task.title}</p>
                              {task.description && (
                                <p className="mb-1 text-ink/70">{task.description}</p>
                              )}
                              <p className="text-ink/50">
                                Status:{" "}
                                <span className="font-medium text-ink/80">
                                  {STATUS_LABEL[task.status] ?? task.status}
                                </span>
                              </p>
                              <p className="text-ink/50">
                                Priority:{" "}
                                <span className="font-medium text-ink/80">
                                  {PRIORITY_LABEL[task.priority] ?? task.priority}
                                </span>
                              </p>
                              {task.due_date && (
                                <p className="text-ink/50">Due: {task.due_date}</p>
                              )}
                              <p className="mt-1 text-ink/50">
                                Assigned to:{" "}
                                <span className="text-ink/80">
                                  {assignees.length > 0
                                    ? assignees.map((a) => a.full_name ?? a.email).join(", ")
                                    : "Nobody"}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
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

                      return (
                        <div
                          key={task.id}
                          className="rounded border border-cream-dark p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-ink">{task.title}</span>
                            <span className="shrink-0 rounded bg-cream-mid px-2 py-0.5 text-xs text-ink/70">
                              {PRIORITY_LABEL[task.priority] ?? task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-ink/70">{task.description}</p>
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
