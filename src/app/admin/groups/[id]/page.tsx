import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupDialog } from "@/components/GroupDialog";
import { GroupMembersDialog } from "@/components/GroupMembersDialog";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";
import { TaskSearchFilter } from "@/components/TaskSearchFilter";
import type { TaskRow } from "@/components/TaskBoardViews";
import { buildTaskBoardData } from "@/lib/taskBoardData";
import { parseMonthParam, monthLabel, shiftMonthParam } from "@/lib/calendar";

type GroupRow = {
  id: string;
  name: string;
  group_members: {
    members: { id: string; email: string; full_name: string | null } | null;
  }[];
};

export default async function AdminGroupTaskBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const { id: groupId } = await params;
  const sp = await searchParams;
  const view =
    sp.view === "calendar" ? "calendar" : sp.view === "list" ? "list" : "board";
  const supabase = await createClient();

  const [{ data: group }, { data: tasks, error: tasksError }, { data: members }, { data: groups }] =
    await Promise.all([
      supabase
        .from("groups")
        .select("id, name, group_members(members(id, email, full_name))")
        .eq("id", groupId)
        .maybeSingle()
        .returns<GroupRow | null>(),
      supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, assigned_group_id, parent_task_id, created_by, task_assignees(members(id, email, full_name)), task_comments(id, body, created_at, members(full_name, email))"
        )
        .eq("assigned_group_id", groupId)
        .is("deleted_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .returns<TaskRow[]>(),
      supabase.from("members").select("id, email, full_name").neq("status", "disabled").order("email"),
      supabase.from("groups").select("id, name").order("name"),
    ]);

  if (!group) {
    notFound();
  }

  const memberOptions = members ?? [];
  const groupOptions = groups ?? [];
  const allTasks = tasks ?? [];
  const currentMembers = group.group_members
    .map((row) => row.members)
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const { year, month } = parseMonthParam(sp.month);
  const { topLevelTasks, subtasksByParent, tasksById, weeks, tasksByDate } = buildTaskBoardData(
    allTasks,
    view,
    year,
    month,
    null,
    true
  );
  const prevMonthHref = `/admin/groups/${groupId}?view=calendar&month=${shiftMonthParam(year, month, -1)}`;
  const nextMonthHref = `/admin/groups/${groupId}?view=calendar&month=${shiftMonthParam(year, month, 1)}`;

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <div className="w-full max-w-6xl">
        <Link href="/admin/groups" className="mb-2 inline-block text-sm text-ink/50 hover:text-brand">
          &larr; Groups
        </Link>

        <div className="mb-2 flex items-center justify-between">
          <h1 className="font-display text-3xl tracking-wide text-ink uppercase">{group.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <GroupDialog
              triggerLabel="Rename"
              heading="Rename group"
              actionUrl={`/admin/groups/${groupId}/rename`}
              defaultValues={{ name: group.name }}
              small
            />
            <GroupMembersDialog
              actionUrl={`/admin/groups/${groupId}/members`}
              members={memberOptions}
              currentMemberIds={currentMembers.map((m) => m.id)}
            />
            <DeleteGroupButton actionUrl={`/admin/groups/${groupId}/delete`} />
          </div>
        </div>

        <p className="mb-6 text-sm text-ink/50">
          Members:{" "}
          {currentMembers.length > 0
            ? currentMembers.map((m) => m.full_name ?? m.email).join(", ")
            : "None yet."}
        </p>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <Link
              href={`/admin/groups/${groupId}?view=board`}
              className={view === "board" ? "font-medium text-brand" : "text-ink/50 hover:text-brand"}
            >
              Board
            </Link>
            <Link
              href={`/admin/groups/${groupId}?view=list`}
              className={view === "list" ? "font-medium text-brand" : "text-ink/50 hover:text-brand"}
            >
              List
            </Link>
            <Link
              href={`/admin/groups/${groupId}?view=calendar`}
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
              <Link href={`/admin/groups/${groupId}?view=calendar`} className="hover:text-brand hover:underline">
                Today
              </Link>
              <span className="font-medium text-ink">{monthLabel(year, month)}</span>
              <Link href={nextMonthHref} aria-label="Next month" className="hover:text-brand">
                &rarr;
              </Link>
            </div>
          )}
        </div>

        {tasksError ? (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {tasksError.message}
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
            actionBasePath="/admin/tasks"
            viewerId={null}
            isAdmin
            showComments={view === "list"}
          />
        )}
      </div>
    </div>
  );
}
