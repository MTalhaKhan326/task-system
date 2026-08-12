import type { TaskRow } from "@/components/TaskBoardViews";
import type { CalendarTask } from "@/components/CalendarView";
import { buildCalendarWeeks, type CalendarDay } from "@/lib/calendar";

// Shapes a flat task list into everything TaskBoardViews needs — the
// same derivation admin/tasks and member/tasks each already do for
// their own full task list, reused here for a single group's tasks.
export function buildTaskBoardData(
  allTasks: TaskRow[],
  view: string,
  year: number,
  month: number,
  viewerId: string | null,
  isAdmin: boolean
): {
  topLevelTasks: TaskRow[];
  subtasksByParent: Record<string, TaskRow[]>;
  tasksById: Record<string, TaskRow>;
  weeks: CalendarDay[][];
  tasksByDate: Record<string, CalendarTask[]>;
} {
  const topLevelTasks = allTasks.filter((t) => !t.parent_task_id);
  const subtasksByParent: Record<string, TaskRow[]> = {};
  const tasksById: Record<string, TaskRow> = {};
  for (const task of allTasks) {
    tasksById[task.id] = task;
    if (task.parent_task_id) {
      (subtasksByParent[task.parent_task_id] ??= []).push(task);
    }
  }

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
        canEdit: isAdmin || (viewerId !== null && task.created_by === viewerId),
      };
      (tasksByDate[task.due_date] ??= []).push(chip);
    }
  }

  return { topLevelTasks, subtasksByParent, tasksById, weeks, tasksByDate };
}
