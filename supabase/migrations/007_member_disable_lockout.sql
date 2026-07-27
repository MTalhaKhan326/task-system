-- Task assignment system: disabled members lose in-app access
-- Run manually in the Supabase SQL editor / dashboard, after 001-006.
--
-- `members.status` has always allowed 'disabled', but nothing actually
-- checked it — every RLS policy for a member's own tasks, comments, and
-- assignments matches on current_member_id(), which only looked at
-- user_id. Setting status='disabled' did nothing functionally; this is
-- what makes the admin "delete member" button (soft delete) actually
-- take effect, in one place, for everything downstream of this
-- function.
--
-- Admins are unaffected: their access goes through the separate
-- is_admin() / "admins full access" policies, not this function.

create or replace function public.current_member_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.members where user_id = auth.uid() and status != 'disabled';
$$;
