-- Task assignment system: add an 'invited' notification event
-- Run manually in the Supabase SQL editor / dashboard, after 001-007.
--
-- Every event so far (assigned, updated, reassigned, deleted,
-- status_changed, comment) is tied to a task, so notifications.task_id
-- was written NOT NULL. "A member was invited" has no task at all, so
-- this makes task_id nullable and adds 'invited' to the allowed
-- event_type values. If the constraint name below doesn't match what's
-- actually in your database (check with the query in the comment),
-- adjust it — this is Postgres's default auto-generated name for an
-- unnamed inline check on this column.

alter table notifications alter column task_id drop not null;

-- select conname from pg_constraint where conrelid = 'notifications'::regclass and contype = 'c';
alter table notifications drop constraint notifications_event_type_check;
alter table notifications add constraint notifications_event_type_check
  check (event_type in ('assigned', 'updated', 'reassigned', 'deleted', 'status_changed', 'comment', 'invited'));
