-- Task assignment system: initial schema
-- Run manually in the Supabase SQL editor / dashboard.

create extension if not exists pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

create table members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  notify_mode text not null default 'email' check (notify_mode in ('email', 'none')),
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references members (id),
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  primary key (group_id, member_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_by uuid not null references members (id),
  assigned_group_id uuid references groups (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table task_assignees (
  task_id uuid not null references tasks (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  primary key (task_id, member_id)
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in ('assigned', 'updated', 'reassigned', 'deleted', 'status_changed', 'comment')
  ),
  task_id uuid not null references tasks (id) on delete cascade,
  actor_id uuid not null references members (id) on delete cascade,
  recipient_id uuid not null references members (id) on delete cascade,
  payload jsonb,
  sent_at timestamptz not null default now(),
  error text
);

-- ============================================================
-- FK indexes (Postgres does not index FK columns automatically)
-- ============================================================

create index members_user_id_idx on members (user_id);

create index groups_created_by_idx on groups (created_by);

create index group_members_member_id_idx on group_members (member_id);

create index tasks_created_by_idx on tasks (created_by);
create index tasks_assigned_group_id_idx on tasks (assigned_group_id);

create index task_assignees_member_id_idx on task_assignees (member_id);

create index task_comments_task_id_idx on task_comments (task_id);
create index task_comments_member_id_idx on task_comments (member_id);

create index notifications_task_id_idx on notifications (task_id);
create index notifications_actor_id_idx on notifications (actor_id);
create index notifications_recipient_id_idx on notifications (recipient_id);

-- ============================================================
-- Signup trigger: link members.user_id when a matching-email
-- auth user is created. Members exist (invited by email) before
-- they ever sign up.
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.members
  set user_id = new.id
  where lower(email) = lower(new.email)
    and user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- RLS helpers
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
-- RLS: enable on every table
-- ============================================================

alter table members enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table tasks enable row level security;
alter table task_assignees enable row level security;
alter table task_comments enable row level security;
alter table notifications enable row level security;

-- members: admins have full access; a member can read their own row.
create policy "admins full access to members"
  on members for all
  using (is_admin())
  with check (is_admin());

create policy "members read own row"
  on members for select
  using (user_id = auth.uid());

-- groups: admin-managed only (members are not shown groups directly).
create policy "admins full access to groups"
  on groups for all
  using (is_admin())
  with check (is_admin());

-- group_members: admin-managed only.
create policy "admins full access to group_members"
  on group_members for all
  using (is_admin())
  with check (is_admin());

-- tasks: admins have full access. Members see only tasks assigned to
-- them, and may change status but nothing else.
create policy "admins full access to tasks"
  on tasks for all
  using (is_admin())
  with check (is_admin());

create policy "members read assigned tasks"
  on tasks for select
  using (
    exists (
      select 1 from task_assignees
      where task_assignees.task_id = tasks.id
        and task_assignees.member_id = current_member_id()
    )
  );

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

-- RLS controls which rows a member can touch; this trigger enforces
-- that a non-admin update only ever changes the status column.
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

-- task_assignees: admin-managed only.
create policy "admins full access to task_assignees"
  on task_assignees for all
  using (is_admin())
  with check (is_admin());

-- task_comments: admins have full access. Members can read and add
-- comments on tasks assigned to them.
create policy "admins full access to task_comments"
  on task_comments for all
  using (is_admin())
  with check (is_admin());

create policy "members read comments on assigned tasks"
  on task_comments for select
  using (
    exists (
      select 1 from task_assignees
      where task_assignees.task_id = task_comments.task_id
        and task_assignees.member_id = current_member_id()
    )
  );

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

-- notifications: log table, admin/service access only.
create policy "admins full access to notifications"
  on notifications for all
  using (is_admin())
  with check (is_admin());
