-- Task assignment system: fix member visibility into task_assignees
-- Run manually in the Supabase SQL editor / dashboard, after 001-003.
--
-- task_assignees previously had only "admins full access to
-- task_assignees" — no policy let a member read their own rows. That
-- silently broke every member-facing policy that checks assignment via
-- `exists (select 1 from task_assignees where ...)` on tasks and
-- task_comments, and the co-assignee clause in 003's members policy:
-- those subqueries run under the member's own session, so with no read
-- access to task_assignees at all they always saw zero rows and always
-- evaluated false, no matter what current_member_id() returned.
--
-- This grants a member read access to (a) their own assignment rows,
-- and (b) any assignment row on a task where they're also assigned
-- (needed for the co-assignee clause in 003). The self-reference on
-- task_assignees is safe: the "own row" branch is a non-recursive base
-- case that terminates the recursive RLS check immediately.

create policy "members read task_assignees for their tasks"
  on task_assignees for select
  using (
    member_id = current_member_id()
    or exists (
      select 1 from task_assignees mine
      where mine.task_id = task_assignees.task_id
        and mine.member_id = current_member_id()
    )
  );
