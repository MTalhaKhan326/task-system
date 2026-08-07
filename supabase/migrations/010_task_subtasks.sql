-- Task assignment system: subtasks
-- Run manually in the Supabase SQL editor / dashboard, after 001-009.
--
-- A subtask is just a task with a parent — it reuses the exact same
-- row shape (own title, description, priority, due_date, status,
-- assignees via task_assignees, comments) rather than being a separate
-- concept. Only a single level of nesting is used by the app (a
-- subtask's own parent_task_id is never set by the UI), though nothing
-- here enforces that at the database level.
--
-- Subtasks never outlive their parent — if a task row is ever actually
-- removed (tasks are normally soft-deleted via deleted_at, so this is
-- a defensive default more than something that fires in practice),
-- its subtasks go with it rather than becoming orphaned top-level
-- tasks.

alter table tasks add column parent_task_id uuid references tasks (id) on delete cascade;
create index tasks_parent_task_id_idx on tasks (parent_task_id);
