-- Task assignment system: member visibility into teammates on shared tasks
-- Run manually in the Supabase SQL editor / dashboard, after 001 and 002.
--
-- 002_rls.sql only lets a member read their own members row ("members
-- read own row"). That's not enough for the /tasks page: when it embeds
-- the comment author or a co-assignee's name/email via a join on
-- members, PostgREST applies RLS to that embedded table too, so any
-- teammate who isn't the viewer comes back null. This adds a second,
-- narrowly scoped SELECT policy: a member can read another member's row
-- only if that member shares a task with them (as a co-assignee, the
-- task's creator, or a comment author on it). It's still task-scoped,
-- not a general members directory.

create policy "members read teammates on shared tasks"
  on members for select
  using (
    exists (
      select 1
      from task_assignees my_assignment
      where my_assignment.member_id = current_member_id()
        and (
          exists (
            select 1 from task_assignees co_assignee
            where co_assignee.task_id = my_assignment.task_id
              and co_assignee.member_id = members.id
          )
          or exists (
            select 1 from tasks t
            where t.id = my_assignment.task_id
              and t.created_by = members.id
          )
          or exists (
            select 1 from task_comments c
            where c.task_id = my_assignment.task_id
              and c.member_id = members.id
          )
        )
    )
  );
