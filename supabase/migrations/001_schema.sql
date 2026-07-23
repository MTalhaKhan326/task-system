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
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
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
  set user_id = new.id,
      status = 'active'
  where lower(email) = lower(new.email)
    and user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- RLS is enabled and policies are defined in 002_rls.sql.
