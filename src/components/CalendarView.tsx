"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { CalendarDay } from "@/lib/calendar";
import {
  STATUS_LABEL,
  STATUS_COLUMNS,
  PRIORITY_LABEL,
  avatarColor,
  initials,
  calendarChipClasses,
} from "@/lib/taskChip";
import { TaskDialog, type TaskDialogHandle } from "@/components/TaskDialog";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Assignee = { id: string; email: string; full_name: string | null };
type MemberOption = { id: string; email: string; full_name: string | null };
type GroupOption = { id: string; name: string };

export type CalendarTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string;
  assignedGroupId: string | null;
  createdBy: string | null;
  assignees: Assignee[];
  // Set when this chip is a subtask — the parent task's title.
  parentTitle: string | null;
  // Set when this chip is a parent with subtasks — their titles/dates,
  // shown even if a subtask has a different (or no) due date, since
  // it otherwise wouldn't appear anywhere near this chip.
  subtaskSummaries: { title: string; dueDate: string | null }[];
  // False for a member viewing a task assigned to them but created by
  // someone else — editing/rescheduling that task would just fail
  // server-side, so the chip drops the click-to-edit dialog and drag
  // handle and becomes view-only (the hover popup still works).
  canEdit: boolean;
};

type CalendarViewProps = {
  weeks: CalendarDay[][];
  tasksByDate: Record<string, CalendarTask[]>;
  members: MemberOption[];
  groups: GroupOption[];
  // "/admin/tasks" for the admin calendar, "/tasks" for a member's own —
  // both the edit dialog's actionUrl and the drag-and-drop fetch are
  // built from this.
  basePath: string;
};

function TaskChip({
  task,
  members,
  groups,
  basePath,
}: {
  task: CalendarTask;
  members: MemberOption[];
  groups: GroupOption[];
  basePath: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !task.canEdit,
  });
  const editRef = useRef<TaskDialogHandle>(null);
  const shown = task.assignees.slice(0, 2);
  const isSubtask = Boolean(task.parentTitle);

  return (
    <div
      ref={setNodeRef}
      {...(task.canEdit ? listeners : {})}
      {...(task.canEdit ? attributes : {})}
      onClick={task.canEdit ? () => editRef.current?.open() : undefined}
      className="group relative"
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        zIndex: isDragging ? 30 : undefined,
      }}
    >
      <div
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
          task.canEdit ? "cursor-pointer active:cursor-grabbing" : "cursor-default"
        } ${calendarChipClasses(task.status)} ${isDragging ? "opacity-50" : ""}`}
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
        <span className="truncate">
          {isSubtask && <span className="text-ink/40">↳ </span>}
          {task.title}
        </span>
      </div>

      {!isDragging && (
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-lg border border-cream-dark bg-white p-3 text-left text-xs opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <p className="mb-1 font-medium text-ink">{task.title}</p>
          {task.description && <p className="mb-1 text-ink/70">{task.description}</p>}
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
          <p className="mt-1 text-ink/50">
            Assigned to:{" "}
            <span className="text-ink/80">
              {task.assignees.length > 0
                ? task.assignees.map((a) => a.full_name ?? a.email).join(", ")
                : "Nobody"}
            </span>
          </p>
          {task.parentTitle && (
            <p className="mt-1 text-ink/50">
              Part of: <span className="text-ink/80">{task.parentTitle}</span>
            </p>
          )}
          {task.subtaskSummaries.length > 0 && (
            <div className="mt-1 text-ink/50">
              Subtasks:
              <ul className="mt-0.5 list-disc pl-4 text-ink/80">
                {task.subtaskSummaries.map((s) => (
                  <li key={s.title}>
                    {s.title}
                    {s.dueDate ? ` — due ${s.dueDate}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {task.canEdit ? (
            <p className="mt-1 text-ink/40">Click to edit. Drag to a date to reschedule.</p>
          ) : task.status === "done" ? (
            <p className="mt-2 text-ink/40">Done — only its creator or an admin can reopen it.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1 pointer-events-auto">
              {STATUS_COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                <form key={c.key} action={`${basePath}/${task.id}/status`} method="POST">
                  <input type="hidden" name="status" value={c.key} />
                  <button
                    type="submit"
                    className="rounded border border-cream-dark px-1.5 py-0.5 text-[10px] text-ink/80 hover:bg-cream-mid"
                  >
                    Move to {c.label}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      )}

      {task.canEdit && (
        <TaskDialog
          ref={editRef}
          hideTrigger
          triggerLabel=""
          heading="Edit task"
          actionUrl={`${basePath}/${task.id}/update`}
          members={members}
          groups={groups}
          defaultValues={{
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.dueDate,
            memberIds: task.assignees.map((a) => a.id),
            groupId: task.assignedGroupId,
          }}
          small
        />
      )}
    </div>
  );
}

function DayCell({
  day,
  tasks,
  members,
  groups,
  basePath,
}: {
  day: CalendarDay;
  tasks: CalendarTask[];
  members: MemberOption[];
  groups: GroupOption[];
  basePath: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.dateKey });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-28 bg-white p-1.5 ${day.inMonth ? "" : "opacity-40"} ${
        isOver ? "bg-brand-soft" : ""
      }`}
    >
      <div className="mb-1 text-xs text-ink/50">{day.dayOfMonth}</div>
      <div className="flex flex-col gap-1">
        {tasks.map((task) => (
          <TaskChip key={task.id} task={task} members={members} groups={groups} basePath={basePath} />
        ))}
      </div>
    </div>
  );
}

export function CalendarView({ weeks, tasksByDate, members, groups, basePath }: CalendarViewProps) {
  const router = useRouter();
  const [localTasksByDate, setLocalTasksByDate] = useState(tasksByDate);
  const [error, setError] = useState<string | null>(null);
  const [syncedTasksByDate, setSyncedTasksByDate] = useState(tasksByDate);

  // Reset local (optimistic) state whenever the server sends fresh
  // props — e.g. after router.refresh(). Adjusting state during render
  // like this (rather than in a useEffect) is the pattern React itself
  // recommends for "derive state from a prop that changed."
  if (tasksByDate !== syncedTasksByDate) {
    setSyncedTasksByDate(tasksByDate);
    setLocalTasksByDate(tasksByDate);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const targetDate = event.over?.id ? String(event.over.id) : null;
    if (!targetDate) return;

    const sourceDate = Object.keys(localTasksByDate).find((date) =>
      localTasksByDate[date].some((t) => t.id === taskId)
    );
    if (!sourceDate || sourceDate === targetDate) return;

    const task = localTasksByDate[sourceDate].find((t) => t.id === taskId);
    if (!task) return;

    const sendEmail = window.confirm("Send an email notification about this due date change?");

    const movedTask = { ...task, dueDate: targetDate };

    const previous = localTasksByDate;
    setLocalTasksByDate((prev) => {
      const next = { ...prev };
      next[sourceDate] = next[sourceDate].filter((t) => t.id !== taskId);
      next[targetDate] = [...(next[targetDate] ?? []), movedTask];
      return next;
    });
    setError(null);
    document.dispatchEvent(new Event("app:pending"));

    try {
      const res = await fetch(`${basePath}/${taskId}/due-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: targetDate, notify: sendEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not move task.");
      }
      router.refresh();
    } catch (err) {
      setLocalTasksByDate(previous);
      setError(err instanceof Error ? err.message : "Could not move task.");
    } finally {
      document.dispatchEvent(new Event("app:pending:done"));
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <DndContext id="task-calendar" sensors={sensors} onDragEnd={handleDragEnd}>
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
                <DayCell
                  key={day.dateKey}
                  day={day}
                  tasks={localTasksByDate[day.dateKey] ?? []}
                  members={members}
                  groups={groups}
                  basePath={basePath}
                />
              ))
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
