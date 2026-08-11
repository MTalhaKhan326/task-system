import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RealtimeTasksListener } from "@/components/RealtimeTasksListener";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskSearchFilter } from "@/components/TaskSearchFilter";
import type { TaskRow } from "@/components/TaskBoardViews";
import type { CalendarTask } from "@/components/CalendarView";
import {
  buildCalendarWeeks,
  monthLabel,
  parseMonthParam,
  shiftMonthParam,
} from "@/lib/calendar";

export default async function MemberTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string; view?: string; month?: string }>;
}) {
  const params = await searchParams;
  const view =
    params.view === "calendar" ? "calendar" : params.view === "list" ? "list" : "board";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/tasks");
  }

  const [{ data: member }, { data: tasks, error }, { data: members }, { data: groups }] =
    await Promise.all([
      supabase.from("members").select("id").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, assigned_group_id, parent_task_id, created_by, task_assignees(members(id, email, full_name)), task_comments(id, body, created_at, members(full_name, email))"
        )
        .is("deleted_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .returns<TaskRow[]>(),
      // Every member (RLS: "members read all members for assignment") —
      // needed for the assignee picker when creating/editing a task.
      supabase.from("members").select("id, email, full_name").neq("status", "disabled").order("email"),
      // Only groups this member can already see (their own + ones
      // they belong to) — group visibility stays scoped even though
      // individual-member assignment doesn't.
      supabase.from("groups").select("id, name").order("name"),
    ]);

  const viewerId = member?.id ?? null;
  const memberOptions = members ?? [];
  const groupOptions = groups ?? [];
  const allTasks = tasks ?? [];

  const topLevelTasks = allTasks.filter((t) => !t.parent_task_id);
  const subtasksByParent: Record<string, TaskRow[]> = {};
  const tasksById: Record<string, TaskRow> = {};
  for (const task of allTasks) {
    tasksById[task.id] = task;
    if (task.parent_task_id) {
      (subtasksByParent[task.parent_task_id] ??= []).push(task);
    }
  }

  const { year, month } = parseMonthParam(params.month);
  const weeks = view === "calendar" ? buildCalendarWeeks(year, month) : [];
  const tasksByDate: Record<string, CalendarTask[]> = {};
  if (view === "calendar") {
    for (const task of allTasks) {
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
        createdBy: task.created_by,
        assignees: task.task_assignees
          .map((row) => row.members)
          .filter((m): m is NonNullable<typeof m> => m !== null),
        parentTitle: parent?.title ?? null,
        subtaskSummaries: subtasks.map((s) => ({ title: s.title, dueDate: s.due_date })),
        canEdit: task.created_by === viewerId,
      };
      (tasksByDate[task.due_date] ??= []).push(chip);
    }
  }
  const prevMonthHref = `/tasks?view=calendar&month=${shiftMonthParam(year, month, -1)}`;
  const nextMonthHref = `/tasks?view=calendar&month=${shiftMonthParam(year, month, 1)}`;

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <RealtimeTasksListener />
      <div className="w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-3xl tracking-wide text-ink uppercase">My tasks</h1>
          <TaskDialog
            triggerLabel="New task"
            heading="New task"
            actionUrl="/tasks/create"
            members={memberOptions}
            groups={groupOptions}
            parentOptions={topLevelTasks.map((task) => ({ id: task.id, title: task.title }))}
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <Link
              href="/tasks?view=board"
              className={view === "board" ? "font-medium text-brand" : "text-ink/50 hover:text-brand"}
            >
              Board
            </Link>
            <Link
              href="/tasks?view=list"
              className={view === "list" ? "font-medium text-brand" : "text-ink/50 hover:text-brand"}
            >
              List
            </Link>
            <Link
              href="/tasks?view=calendar"
              className={view === "calendar" ? "font-medium text-brand" : "text-ink/50 hover:text-brand"}
            >
              Calendar
            </Link>
          </div>

          {view === "calendar" && (
            <div className="flex items-center gap-3 text-sm text-ink/80">
              <Link href={prevMonthHref} aria-label="Previous month" className="hover:text-brand">
                &larr;
              </Link>
              <Link href="/tasks?view=calendar" className="hover:text-brand hover:underline">
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

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error.message}
          </p>
        ) : (
          <TaskSearchFilter
            view={view}
            topLevelTasks={topLevelTasks}
            allTasks={allTasks}
            subtasksByParent={subtasksByParent}
            tasksById={tasksById}
            weeks={weeks}
            tasksByDate={tasksByDate}
            members={memberOptions}
            groups={groupOptions}
            actionBasePath="/tasks"
            viewerId={viewerId}
            isAdmin={false}
            showComments={view === "list"}
          />
        )}
      </div>
    </div>
  );
}
