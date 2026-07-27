-- Task assignment system: members can edit their own profile name
-- Run manually in the Supabase SQL editor / dashboard, after 001-005.
--
-- There was previously no UPDATE policy on `members` at all for
-- non-admins — "members read own row" only covers SELECT. This adds
-- the ability for a member to update their own row, restricted to
-- full_name only (same two-layer pattern as tasks: RLS controls which
-- row, a trigger controls which column). Without the trigger, a member
-- could otherwise submit role='admin' or status='active' on their own
-- row and self-promote — RLS alone can't stop that, since it only
-- gates rows, not columns.
--
-- The trigger skips restriction when auth.uid() is null. That's not a
-- loophole for a live user session (every authenticated request has a
-- non-null auth.uid()) — it's what lets handle_new_user()'s own update
-- of user_id/status during signup keep working, since that trigger
-- runs as an internal system operation with no user session attached.

create policy "members update own full_name"
  on members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create function public.restrict_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.notify_mode is distinct from old.notify_mode
    or new.user_id is distinct from old.user_id
  then
    raise exception 'members may only update their own full_name';
  end if;

  return new;
end;
$$;

create trigger members_restrict_self_update
  before update on members
  for each row
  execute function public.restrict_member_self_update();
