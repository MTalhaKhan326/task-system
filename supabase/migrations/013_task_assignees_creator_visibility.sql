-- Fixes a gap in 012_member_task_and_group_creation.sql: a member who
-- creates a task but assigns it to someone else (not themselves) had no
-- way to actually see the resulting task_assignees rows — the existing
-- member policy on task_assignees only covered "I'm the assignee" or
-- "I'm a co-assignee on this task", not "I created this task." That
-- made the edit dialog show nobody as checked, even though the
-- assignment existed.

create policy "members read task_assignees for own created tasks"
  on task_assignees for select
  using (
    exists (
      select 1 from tasks
      where tasks.id = task_assignees.task_id
        and tasks.created_by = current_member_id()
    )
  );
