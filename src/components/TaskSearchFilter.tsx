"use client";

import { useMemo, useState } from "react";
import { TaskBoardViews, type TaskRow } from "@/components/TaskBoardViews";
import type { CalendarDay } from "@/lib/calendar";
import type { CalendarTask } from "@/components/CalendarView";

type MemberOption = { id: string; email: string; full_name: string | null };
type GroupOption = { id: string; name: string };

type Props = {
  view: "board" | "list" | "calendar";
  topLevelTasks: TaskRow[];
  allTasks: TaskRow[];
  subtasksByParent: Record<string, TaskRow[]>;
  tasksById: Record<string, TaskRow>;
  weeks: CalendarDay[][];
  tasksByDate: Record<string, CalendarTask[]>;
  members: MemberOption[];
  groups: GroupOption[];
  actionBasePath: string;
  viewerId: string | null;
  isAdmin: boolean;
  showComments?: boolean;
};

// Client-side substring search over whatever's already been fetched for
// this page — scoped to whichever tasks are already visible here, same
// as everything else on this page. Small internal dataset, so no server
// round-trip or search index is needed. Matches on task title/
// description, the task's creator name, or its assigned group's name.
export function TaskSearchFilter({
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
}: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  function creatorLabel(id: string | null) {
    const m = id ? membersById.get(id) : null;
    return m ? (m.full_name ?? m.email) : "";
  }

  function groupLabel(id: string | null) {
    return id ? (groupsById.get(id)?.name ?? "") : "";
  }

  function matchesTaskRow(task: TaskRow) {
    if (!q) return true;
    const haystack = [
      task.title,
      task.description ?? "",
      creatorLabel(task.created_by),
      groupLabel(task.assigned_group_id),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  }

  function matchesCalendarTask(task: CalendarTask) {
    if (!q) return true;
    const haystack = [
      task.title,
      task.description ?? "",
      creatorLabel(task.createdBy),
      groupLabel(task.assignedGroupId),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  }

  const filteredTopLevel = topLevelTasks.filter(matchesTaskRow);
  const filteredAll = allTasks.filter(matchesTaskRow);
  const filteredTasksByDate: Record<string, CalendarTask[]> = {};
  for (const [date, chips] of Object.entries(tasksByDate)) {
    const kept = chips.filter(matchesCalendarTask);
    if (kept.length > 0) filteredTasksByDate[date] = kept;
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by task name, creator, or group..."
        className="mb-4 w-full rounded border border-cream-dark px-3 py-2 text-sm text-ink"
      />
      <TaskBoardViews
        view={view}
        topLevelTasks={filteredTopLevel}
        allTasks={filteredAll}
        subtasksByParent={subtasksByParent}
        tasksById={tasksById}
        weeks={weeks}
        tasksByDate={filteredTasksByDate}
        members={members}
        groups={groups}
        actionBasePath={actionBasePath}
        viewerId={viewerId}
        isAdmin={isAdmin}
        showComments={showComments}
      />
    </div>
  );
}
