-- Task assignment system: row level security
-- Run manually in the Supabase SQL editor / dashboard, after 001_schema.sql.

-- ============================================================
-- Helpers
--
-- Policies on `members` can't query `members` directly without
-- recursing into RLS again. Both helpers are security definer so
-- they run as the function owner and bypass RLS internally, then
-- get reused by every policy below that needs to know "is this
-- caller an admin?" or "which members row is this caller?".
-- ============================================================

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create function public.current_member_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.members where user_id = auth.uid();
$$;

-- ============================================================
-- Enable RLS on every table
-- ============================================================

alter table members enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table tasks enable row level security;
alter table task_assignees enable row level security;
alter table task_comments enable row level security;
alter table notifications enable row level security;

-- ============================================================
-- members
-- ============================================================

-- Admins can read/write every members row.
create policy "admins full access to members"
  on members for all
  using (is_admin())
  with check (is_admin());

-- A signed-in member can read their own row (profile info, role, etc).
create policy "members read own row"
  on members for select
  using (user_id = auth.uid());

-- ============================================================
-- groups
-- ============================================================

-- Groups are an admin-only concern; members are never shown groups
-- directly, only the tasks that get fanned out from them.
create policy "admins full access to groups"
  on groups for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- group_members
-- ============================================================

-- Membership in a group is managed by admins only.
create policy "admins full access to group_members"
  on group_members for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- tasks
-- ============================================================

-- Admins can read/write every task, including soft-deleted ones.
create policy "admins full access to tasks"
  on tasks for all
  using (is_admin())
  with check (is_admin());

-- A member can read a task only if they have a matching row in
-- task_assignees.
create policy "members read assigned tasks"
  on tasks for select
  using (
    exists (
      select 1 from task_assignees
      where task_assignees.task_id = tasks.id
        and task_assignees.member_id = current_member_id()
    )
  );

-- A member can target only their assigned tasks with an update.
-- (Restricting them to the status column specifically is enforced
-- below by a trigger, since RLS only governs rows, not columns.)
create policy "members update status on assigned tasks"
  on tasks for update
  using (
    exists (
      select 1 from task_assignees
      where task_assignees.task_id = tasks.id
        and task_assignees.member_id = current_member_id()
    )
  )
  with check (
    exists (
      select 1 from task_assignees
      where task_assignees.task_id = tasks.id
        and task_assignees.member_id = current_member_id()
    )
  );

-- Column-level backstop for the policy above: a non-admin update
-- that changes anything but status is rejected outright.
create function public.restrict_task_update_to_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
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

create trigger tasks_restrict_member_update
  before update on tasks
  for each row
  execute function public.restrict_task_update_to_status();

-- ============================================================
-- task_assignees
-- ============================================================

-- Assignment rows are written by admins only (fan-out on assign).
create policy "admins full access to task_assignees"
  on task_assignees for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- task_comments
-- ============================================================

-- Admins can read/write every comment.
create policy "admins full access to task_comments"
  on task_comments for all
  using (is_admin())
  with check (is_admin());

-- A member can read comments on a task only if they're assigned to it.
create policy "members read comments on assigned tasks"
  on task_comments for select
  using (
    exists (
      select 1 from task_assignees
      where task_assignees.task_id = task_comments.task_id
        and task_assignees.member_id = current_member_id()
    )
  );

-- A member can add a comment, authored as themselves, only on a task
-- they're assigned to.
create policy "members add comments on assigned tasks"
  on task_comments for insert
  with check (
    member_id = current_member_id()
    and exists (
      select 1 from task_assignees
      where task_assignees.task_id = task_comments.task_id
        and task_assignees.member_id = current_member_id()
    )
  );

-- ============================================================
-- notifications
-- ============================================================

-- Log table: admin/service access only, no member-facing reads.
create policy "admins full access to notifications"
  on notifications for all
  using (is_admin())
  with check (is_admin());
