# Task assignment system

Internal tool for a fitness company. Admins assign tasks to individuals or groups; members update status.

## Stack
Next.js 16 (App Router, TypeScript, src/), Tailwind, Supabase (Postgres + Auth + RLS), Resend for email. No n8n, no other services.

## Env vars (already in .env.local)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, RESEND_API_KEY
Supabase uses the new key format (sb_publishable_/sb_secret_), not anon/service_role.
The secret key is server-only and must never appear in client components or NEXT_PUBLIC_ vars.

## Roles
- admin: create/update/delete tasks, invite members by email, create groups, see all tasks
- member: see only tasks assigned to them, change status, add comments. Nothing else.

## Schema
- members(id, email unique, user_id → auth.users nullable, full_name, role, status, notify_mode)
  email exists before signup; a trigger links user_id on signup
- groups(id, name, created_by)
- group_members(group_id, member_id)
- tasks(id, title, description, status, priority, due_date, created_by, assigned_group_id nullable, deleted_at nullable)
  status: todo | doing | done. Deletes are soft (deleted_at).
- task_assignees(task_id, member_id) — assignment always lands here, one row per person.
  Assigning to a group fans out to one row per member at assign time.
- task_comments(id, task_id, member_id, body)
- notifications(id, event_type, task_id, actor_id, recipient_id, payload, sent_at, error)
  Log table, written after each email attempt. Not a queue.

## RLS — required on every table
Members read tasks only via a matching row in task_assignees. Members may update only the status column. Admins have full access.

## Email (Resend, sent from API routes)
assigned → assignees; updated → assignees; reassigned → new + old; deleted → assignees at deletion; status changed → task creator; comment → creator + other assignees.
A failed email must never fail the mutation: wrap sends in try/catch and log the outcome to notifications.

## Rules
- All SQL goes in supabase/migrations/*.sql for me to run manually in the dashboard. Never assume you can reach the database.
- Every new table gets `enable row level security` in the same migration.
- Server components for reads, route handlers for writes.