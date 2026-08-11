-- Enables Supabase Realtime (Postgres change broadcasts) for the tasks
-- board/list/calendar so every open browser sees create/update/delete/
-- reassignment as it happens, instead of only after a manual refresh.
-- Realtime respects each table's existing RLS policies — members still
-- only receive events for tasks they're assigned to.

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table task_assignees;
