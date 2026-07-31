-- Task assignment system: true member deletion, history preserved
-- Run manually in the Supabase SQL editor / dashboard, after 001-008.
--
-- Deleting a member now does a real DELETE FROM members (plus their
-- Supabase Auth account, handled in the app), not a status='disabled'
-- flag. Everything that referenced them via CASCADE would have been
-- silently destroyed along with them — completed tasks would lose the
-- record of who did what. This switches those references to
-- ON DELETE SET NULL instead, so the historical rows survive with the
-- member reference cleared. group_members is left as CASCADE — a
-- membership record has no meaning to keep once the member is gone.
--
-- task_assignees needed a bigger change: its primary key was the
-- composite (task_id, member_id), and a PRIMARY KEY column can never
-- be nullable in Postgres. It gets a surrogate id as the real primary
-- key, with (task_id, member_id) becoming a plain unique constraint
-- instead (which does allow multiple NULLs, unlike a primary key).

alter table task_assignees add column id uuid not null default gen_random_uuid();
alter table task_assignees drop constraint task_assignees_pkey;
alter table task_assignees add constraint task_assignees_pkey primary key (id);
alter table task_assignees add constraint task_assignees_task_id_member_id_key unique (task_id, member_id);
alter table task_assignees alter column member_id drop not null;
alter table task_assignees drop constraint task_assignees_member_id_fkey;
alter table task_assignees add constraint task_assignees_member_id_fkey
  foreign key (member_id) references members (id) on delete set null;

alter table task_comments alter column member_id drop not null;
alter table task_comments drop constraint task_comments_member_id_fkey;
alter table task_comments add constraint task_comments_member_id_fkey
  foreign key (member_id) references members (id) on delete set null;

alter table notifications alter column actor_id drop not null;
alter table notifications drop constraint notifications_actor_id_fkey;
alter table notifications add constraint notifications_actor_id_fkey
  foreign key (actor_id) references members (id) on delete set null;

alter table notifications alter column recipient_id drop not null;
alter table notifications drop constraint notifications_recipient_id_fkey;
alter table notifications add constraint notifications_recipient_id_fkey
  foreign key (recipient_id) references members (id) on delete set null;

alter table tasks alter column created_by drop not null;
alter table tasks drop constraint tasks_created_by_fkey;
alter table tasks add constraint tasks_created_by_fkey
  foreign key (created_by) references members (id) on delete set null;

alter table groups alter column created_by drop not null;
alter table groups drop constraint groups_created_by_fkey;
alter table groups add constraint groups_created_by_fkey
  foreign key (created_by) references members (id) on delete set null;
