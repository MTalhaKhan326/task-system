import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskBoardViews, type TaskRow } from "@/components/TaskBoardViews";

export default async function GroupTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/tasks/groups/${groupId}`);
  }

  const [{ data: member }, { data: group }, { data: tasks }, { data: members }] =
    await Promise.all([
      supabase.from("members").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
      supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, assigned_group_id, parent_task_id, created_by, task_assignees(members(id, email, full_name))"
        )
        .eq("assigned_group_id", groupId)
        .is("deleted_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .returns<TaskRow[]>(),
      supabase.from("members").select("id, email, full_name").neq("status", "disabled").order("email"),
    ]);

  // RLS scopes both queries: this only resolves if the group is visible
  // to the signed-in member (their own or one they belong to), and the
  // task list only ever contains tasks this member can already see.
  if (!group) {
    notFound();
  }

  const viewerId = member?.id ?? null;
  const memberOptions = members ?? [];
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

  return (
    <div className="flex flex-1 flex-col items-center bg-cream px-4 py-16">
      <div className="w-full max-w-6xl">
        <Link href="/tasks/groups" className="mb-2 inline-block text-sm text-ink/50 hover:text-brand">
          &larr; My groups
        </Link>
        <h1 className="mb-6 font-display text-3xl tracking-wide text-ink uppercase">{group.name}</h1>

        <TaskBoardViews
          view="list"
          topLevelTasks={topLevelTasks}
          allTasks={allTasks}
          subtasksByParent={subtasksByParent}
          tasksById={tasksById}
          weeks={[]}
          tasksByDate={{}}
          members={memberOptions}
          groups={[]}
          actionBasePath="/tasks"
          viewerId={viewerId}
          isAdmin={false}
          showComments
        />
      </div>
    </div>
  );
}
