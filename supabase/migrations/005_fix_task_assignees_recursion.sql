-- Task assignment system: fix infinite recursion in task_assignees RLS
-- Run manually in the Supabase SQL editor / dashboard, after 004.
--
-- 004's "members read task_assignees for their tasks" policy queried
-- task_assignees from within its own USING clause (to check for
-- co-assignees on the same task). Postgres does not treat the "this is
-- my own row" branch as a safe base case there — it detects the
-- self-reference and raises "infinite recursion detected in policy for
-- relation" rather than risk it.
--
-- The fix is the same pattern already used by is_admin() and
-- current_member_id(): a security definer function runs as its owner,
-- not the calling role, so it bypasses RLS entirely when it queries
-- task_assignees internally. Calling it from the policy no longer
-- re-triggers RLS on the same table, so there's nothing to recurse
-- into.

drop policy if exists "members read task_assignees for their tasks" on task_assignees;

create or replace function public.is_co_assignee(p_task_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from task_assignees
    where task_id = p_task_id
      and member_id = current_member_id()
  );
$$;

create policy "members read task_assignees for their tasks"
  on task_assignees for select
  using (
    member_id = current_member_id()
    or is_co_assignee(task_id)
  );
