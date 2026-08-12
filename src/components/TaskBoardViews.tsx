import { TaskDialog } from "@/components/TaskDialog";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { CommentThread } from "@/components/CommentThread";
import { CalendarView, type CalendarTask } from "@/components/CalendarView";
import type { CalendarDay } from "@/lib/calendar";
import { PRIORITY_LABEL, STATUS_COLUMNS } from "@/lib/taskChip";

type MemberOption = { id: string; email: string; full_name: string | null };
type GroupOption = { id: string; name: string };

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_group_id: string | null;
  parent_task_id: string | null;
  created_by: string | null;
  task_assignees: {
    members: { id: string; email: string; full_name: string | null } | null;
  }[];
  task_comments?: {
    id: string;
    body: string;
    created_at: string;
    members: { full_name: string | null; email: string } | null;
  }[];
};

type TaskBoardViewsProps = {
  view: "board" | "list" | "calendar" | "created";
  topLevelTasks: TaskRow[];
  allTasks: TaskRow[];
  subtasksByParent: Record<string, TaskRow[]>;
  tasksById: Record<string, TaskRow>;
  weeks: CalendarDay[][];
  tasksByDate: Record<string, CalendarTask[]>;
  members: MemberOption[];
  groups: GroupOption[];
  // "/admin/tasks" for the admin board, "/tasks" for a member's own.
  actionBasePath: string;
  // Whichever member row belongs to the person viewing this — used to
  // decide whether they can fully edit/delete a given task (its creator)
  // or only move its status (merely assigned to it), and to sort the
  // "Created by me" view. Always ignored for editing when isAdmin is
  // set, but still needed to identify the admin's own created tasks.
  viewerId: string | null;
  isAdmin: boolean;
  // Only the member's List view keeps the comment thread that page has
  // always had — admin's Board/List/Calendar never had comments and
  // don't gain them here.
  showComments?: boolean;
};

function canEditTask(task: TaskRow, isAdmin: boolean, viewerId: string | null) {
  return isAdmin || (viewerId !== null && task.created_by === viewerId);
}

// Once a task is done, a plain assignee can no longer move it at all —
// only its creator or an admin can. Before then, any assignee can still
// move it freely, same as always.
function canChangeStatus(task: TaskRow, isAdmin: boolean, viewerId: string | null) {
  if (task.status !== "done") return true;
  return canEditTask(task, isAdmin, viewerId);
}

function StatusMoveButtons({
  task,
  actionBasePath,
}: {
  task: { id: string; status: string };
  actionBasePath: string;
}) {
  return (
    <>
      {STATUS_COLUMNS.filter((c) => c.key !== task.status).map((c) => (
        <form key={c.key} action={`${actionBasePath}/${task.id}/status`} method="POST">
          <input type="hidden" name="status" value={c.key} />
          <button
            type="submit"
            className="rounded border border-cream-dark px-2 py-1 text-xs text-ink/80 hover:bg-cream-mid"
          >
            Move to {c.label}
          </button>
        </form>
      ))}
    </>
  );
}

// The full-detail card used by both the List view and the "Created by
// me" view — same rendering, just a different order/grouping of which
// tasks get passed in.
function TaskListCard({
  task,
  subtasksByParent,
  members,
  groups,
  actionBasePath,
  viewerId,
  isAdmin,
  showComments,
}: {
  task: TaskRow;
  subtasksByParent: Record<string, TaskRow[]>;
  members: MemberOption[];
  groups: GroupOption[];
  actionBasePath: string;
  viewerId: string | null;
  isAdmin: boolean;
  showComments?: boolean;
}) {
  const assignees = task.task_assignees
    .map((row) => row.members)
    .filter((m): m is NonNullable<typeof m> => m !== null);
  const subtasks = subtasksByParent[task.id] ?? [];
  const editable = canEditTask(task, isAdmin, viewerId);

  return (
    <div className="rounded border border-cream-dark bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-ink">{task.title}</span>
        <span className="shrink-0 rounded bg-cream-mid px-2 py-0.5 text-xs text-ink/70">
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
      </div>

      {task.description && <p className="mt-1 text-sm text-ink/70">{task.description}</p>}

      {task.due_date && <p className="mt-1 text-xs text-ink/50">Due {task.due_date}</p>}

      {assignees.length > 0 && (
        <p className="mt-1 text-xs text-ink/50">
          {assignees.map((a) => a.full_name ?? a.email).join(", ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canChangeStatus(task, isAdmin, viewerId) ? (
          <StatusMoveButtons task={task} actionBasePath={actionBasePath} />
        ) : (
          <span className="text-xs text-ink/40">Done — locked</span>
        )}

        {editable && (
          <TaskDialog
            triggerLabel="Edit"
            heading="Edit task"
            actionUrl={`${actionBasePath}/${task.id}/update`}
            members={members}
            groups={groups}
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
        )}

        {editable && <DeleteTaskButton actionUrl={`${actionBasePath}/${task.id}/delete`} />}
      </div>

      {showComments && (
        <CommentThread
          taskId={task.id}
          actionBasePath={actionBasePath}
          comments={task.task_comments ?? []}
        />
      )}

      <div className="mt-4 border-t border-cream-dark pt-3 pl-4">
        <p className="mb-2 text-xs font-medium uppercase text-ink/50">
          Subtasks {subtasks.length > 0 ? `(${subtasks.length})` : ""}
        </p>

        <div className="flex flex-col gap-2">
          {subtasks.map((subtask) => {
            const subAssignees = subtask.task_assignees
              .map((row) => row.members)
              .filter((m): m is NonNullable<typeof m> => m !== null);
            const subEditable = canEditTask(subtask, isAdmin, viewerId);

            return (
              <div key={subtask.id} className="rounded border border-cream-dark p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink">{subtask.title}</span>
                  <span className="shrink-0 rounded bg-cream-mid px-2 py-0.5 text-xs text-ink/70">
                    {PRIORITY_LABEL[subtask.priority] ?? subtask.priority}
                  </span>
                </div>

                {subtask.description && <p className="mt-1 text-ink/70">{subtask.description}</p>}

                {subtask.due_date && <p className="mt-1 text-xs text-ink/50">Due {subtask.due_date}</p>}

                {subAssignees.length > 0 && (
                  <p className="mt-1 text-xs text-ink/50">
                    {subAssignees.map((a) => a.full_name ?? a.email).join(", ")}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {canChangeStatus(subtask, isAdmin, viewerId) ? (
                    <StatusMoveButtons task={subtask} actionBasePath={actionBasePath} />
                  ) : (
                    <span className="text-xs text-ink/40">Done — locked</span>
                  )}

                  {subEditable && (
                    <TaskDialog
                      triggerLabel="Edit"
                      heading="Edit subtask"
                      actionUrl={`${actionBasePath}/${subtask.id}/update`}
                      members={members}
                      groups={groups}
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
                  )}

                  {subEditable && <DeleteTaskButton actionUrl={`${actionBasePath}/${subtask.id}/delete`} />}
                </div>

                {showComments && (
                  <CommentThread
                    taskId={subtask.id}
                    actionBasePath={actionBasePath}
                    comments={subtask.task_comments ?? []}
                  />
                )}
              </div>
            );
          })}

          {subtasks.length === 0 && <p className="text-xs text-ink/50">No subtasks yet.</p>}

          <TaskDialog
            triggerLabel="+ Add subtask"
            heading={`New subtask on "${task.title}"`}
            actionUrl={`${actionBasePath}/create`}
            members={members}
            groups={groups}
            parentTaskId={task.id}
            small
          />
        </div>
      </div>
    </div>
  );
}

export function TaskBoardViews({
  view,
  topLevelTasks,
  allTasks,
  subtasksByParent,
  tasksById,
  weeks,
  tasksByDate,
  members,
  groups,
  actionBasePath,
  viewerId,
  isAdmin,
  showComments,
}: TaskBoardViewsProps) {
  if (view === "calendar") {
    return (
      <CalendarView weeks={weeks} tasksByDate={tasksByDate} members={members} groups={groups} basePath={actionBasePath} />
    );
  }

  // A member (or admin) can be assigned to, or have created, a subtask
  // whose parent task they can't otherwise see — RLS just omits that
  // parent row entirely rather than erroring. Show those subtasks as
  // their own standalone cards instead of silently dropping them.
  const orphanSubtasks = allTasks.filter((t) => t.parent_task_id && !tasksById[t.parent_task_id]);
  const listTopLevel = [...topLevelTasks, ...orphanSubtasks];

  if (view === "list") {
    return (
      <div className="flex flex-col gap-4">
        {listTopLevel.map((task) => (
          <TaskListCard
            key={task.id}
            task={task}
            subtasksByParent={subtasksByParent}
            members={members}
            groups={groups}
            actionBasePath={actionBasePath}
            viewerId={viewerId}
            isAdmin={isAdmin}
            showComments={showComments}
          />
        ))}
        {listTopLevel.length === 0 && <p className="text-center text-sm text-ink/50">No tasks.</p>}
      </div>
    );
  }

  if (view === "created") {
    const createdByMe = listTopLevel.filter((t) => viewerId !== null && t.created_by === viewerId);
    const others = listTopLevel.filter((t) => !(viewerId !== null && t.created_by === viewerId));

    return (
      <div className="flex flex-col gap-4">
        {createdByMe.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase text-ink/50">Created by you</p>
            {createdByMe.map((task) => (
              <TaskListCard
                key={task.id}
                task={task}
                subtasksByParent={subtasksByParent}
                members={members}
                groups={groups}
                actionBasePath={actionBasePath}
                viewerId={viewerId}
                isAdmin={isAdmin}
                showComments={showComments}
              />
            ))}
          </>
        )}

        {others.length > 0 && (
          <>
            <p className={createdByMe.length > 0 ? "mt-2 text-xs font-medium uppercase text-ink/50" : "text-xs font-medium uppercase text-ink/50"}>
              Assigned to you
            </p>
            {others.map((task) => (
              <TaskListCard
                key={task.id}
                task={task}
                subtasksByParent={subtasksByParent}
                members={members}
                groups={groups}
                actionBasePath={actionBasePath}
                viewerId={viewerId}
                isAdmin={isAdmin}
                showComments={showComments}
              />
            ))}
          </>
        )}

        {listTopLevel.length === 0 && <p className="text-center text-sm text-ink/50">No tasks.</p>}
      </div>
    );
  }

  // Board — unlike List/Calendar, this includes subtasks directly in
  // their status column (not nested), same as the original admin board.
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_COLUMNS.map((column) => {
        const columnTasks = allTasks.filter((t) => t.status === column.key);
        return (
          <div key={column.key} className="rounded border border-cream-dark bg-white">
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
                const editable = canEditTask(task, isAdmin, viewerId);

                return (
                  <div key={task.id} className="rounded border border-cream-dark p-3 text-sm">
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

                    {task.description && <p className="mt-1 text-ink/70">{task.description}</p>}

                    {subtasks.length > 0 && (
                      <p className="mt-1 text-xs text-ink/50">
                        Subtasks: {subtasks.map((s) => s.title).join(", ")}
                      </p>
                    )}

                    {task.due_date && <p className="mt-1 text-xs text-ink/50">Due {task.due_date}</p>}

                    {assignees.length > 0 && (
                      <p className="mt-1 text-xs text-ink/50">
                        {assignees.map((a) => a.full_name ?? a.email).join(", ")}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {canChangeStatus(task, isAdmin, viewerId) ? (
                        <StatusMoveButtons task={task} actionBasePath={actionBasePath} />
                      ) : (
                        <span className="text-xs text-ink/40">Done — locked</span>
                      )}

                      {editable && (
                        <TaskDialog
                          triggerLabel="Edit"
                          heading="Edit task"
                          actionUrl={`${actionBasePath}/${task.id}/update`}
                          members={members}
                          groups={groups}
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
                      )}

                      {editable && <DeleteTaskButton actionUrl={`${actionBasePath}/${task.id}/delete`} />}
                    </div>
                  </div>
                );
              })}
              {columnTasks.length === 0 && (
                <p className="px-1 py-4 text-center text-xs text-ink/50">No tasks.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
