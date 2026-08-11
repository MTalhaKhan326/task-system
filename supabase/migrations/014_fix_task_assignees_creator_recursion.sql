-- Fixes infinite recursion introduced by 012_member_task_and_group_
-- creation.sql and 013_task_assignees_creator_visibility.sql: those
-- policies queried `tasks` directly from a policy on task_assignees,
-- and tasks' own "members read assigned tasks" policy queries
-- task_assignees right back — the same category of bug fixed for a
-- different pair of policies in 005_fix_task_assignees_recursion.sql.
-- Same fix here: move the cross-table check into a security definer
-- function, which runs as the function owner (exempt from RLS) instead
-- of re-triggering the querying role's own policies.

create or replace function public.is_task_creator(p_task_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from tasks
    where id = p_task_id
      and created_by = current_member_id()
  );
$$;

drop policy if exists "members read task_assignees for own created tasks" on task_assignees;
create policy "members read task_assignees for own created tasks"
  on task_assignees for select
  using (is_task_creator(task_id));

drop policy if exists "members assign own created tasks" on task_assignees;
create policy "members assign own created tasks"
  on task_assignees for insert
  with check (is_task_creator(task_id));

drop policy if exists "members unassign own created tasks" on task_assignees;
create policy "members unassign own created tasks"
  on task_assignees for delete
  using (is_task_creator(task_id));
