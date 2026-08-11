-- Lets members create tasks (assignable to anyone) and their own groups
-- (visible only to admins + the group's own members), on top of the
-- existing admin-only model from 002_rls.sql. Run manually after 011.

-- ============================================================
-- Helper: co-membership check for group_members, mirroring
-- is_co_assignee() from 005_fix_task_assignees_recursion.sql — a policy
-- on group_members can't query group_members directly without recursing
-- into RLS again, so this security-definer function does the lookup
-- instead.
-- ============================================================

create or replace function public.is_co_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id
      and member_id = current_member_id()
  );
$$;

-- ============================================================
-- tasks — members can create their own tasks and fully manage them
-- ============================================================

create policy "members create own tasks"
  on tasks for insert
  with check (created_by = current_member_id());

create policy "members read own created tasks"
  on tasks for select
  using (created_by = current_member_id());

create policy "members update own created tasks"
  on tasks for update
  using (created_by = current_member_id())
  with check (created_by = current_member_id());

-- The column-level backstop (members may only change status) now also
-- lets a task's own creator through untouched, same as the existing
-- is_admin() early-return right above this.
create or replace function public.restrict_task_update_to_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  if old.created_by = current_member_id() then
    return new;
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.priority is distinct from old.priority
    or new.due_date is distinct from old.due_date
    or new.created_by is distinct from old.created_by
    or new.assigned_group_id is distinct from old.assigned_group_id
    or new.deleted_at is distinct from old.deleted_at
  then
    raise exception 'members may only update task status';
  end if;

  return new;
end;
$$;

-- ============================================================
-- task_assignees — a task's creator can assign/unassign anyone
-- ============================================================

create policy "members assign own created tasks"
  on task_assignees for insert
  with check (
    exists (
      select 1 from tasks
      where tasks.id = task_assignees.task_id
        and tasks.created_by = current_member_id()
    )
  );

create policy "members unassign own created tasks"
  on task_assignees for delete
  using (
    exists (
      select 1 from tasks
      where tasks.id = task_assignees.task_id
        and tasks.created_by = current_member_id()
    )
  );

-- ============================================================
-- members — the assignee picker needs to see the whole roster.
-- This intentionally broadens member-to-member visibility beyond the
-- existing "teammates on shared tasks only" rule (003_member_task_
-- visibility.sql) — it's the direct cost of letting members assign
-- tasks to anyone in the company, not just people they already work
-- with on a shared task.
-- ============================================================

create policy "members read all members for assignment"
  on members for select
  using (true);

-- ============================================================
-- groups — members can create and fully manage their own groups, and
-- see (read-only) groups they've been added to by someone else.
-- ============================================================

create policy "members manage own groups"
  on groups for all
  using (created_by = current_member_id())
  with check (created_by = current_member_id());

create policy "members view groups they belong to"
  on groups for select
  using (is_co_group_member(id));

-- ============================================================
-- group_members — visible to anyone in the group (or its creator),
-- writable only by the group's creator.
-- ============================================================

create policy "members read group_members for their groups"
  on group_members for select
  using (
    is_co_group_member(group_id)
    or exists (
      select 1 from groups
      where groups.id = group_members.group_id
        and groups.created_by = current_member_id()
    )
  );

create policy "members manage group_members for own groups"
  on group_members for all
  using (
    exists (
      select 1 from groups
      where groups.id = group_members.group_id
        and groups.created_by = current_member_id()
    )
  )
  with check (
    exists (
      select 1 from groups
      where groups.id = group_members.group_id
        and groups.created_by = current_member_id()
    )
  );
