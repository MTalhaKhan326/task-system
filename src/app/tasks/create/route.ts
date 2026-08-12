import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMany } from "@/lib/email/notify";

// Member-facing task creation — any signed-in member (not just admins)
// can create a task here and assign it to anyone in the company. See
// supabase/migrations/012_member_task_and_group_creation.sql for the
// RLS that actually allows this at the database level; this route's
// own check is just "are you signed in at all," same defense-in-depth
// pairing the admin routes use.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "medium");
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const memberIds = formData.getAll("memberIds").map(String);
  const groupIds = formData.getAll("groupIds").map(String);
  const parentTaskId = String(formData.get("parentTaskId") ?? "").trim() || null;
  const notifyEnabled = String(formData.get("notify") ?? "true") !== "false";

  const tasksUrl = new URL("/tasks", request.url);
  if (parentTaskId) {
    tasksUrl.searchParams.set("view", "list");
  }

  if (!title) {
    tasksUrl.searchParams.set("error", "Title is required.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  let groupMemberIds: string[] = [];
  if (groupIds.length > 0) {
    const { data: groupMembers } = await supabase
      .from("group_members")
      .select("member_id")
      .in("group_id", groupIds);
    groupMemberIds = (groupMembers ?? []).map((row) => row.member_id);
  }

  const assigneeIds = Array.from(new Set([...memberIds, ...groupMemberIds]));
  // Based purely on whether a group is checked — not on memberIds, so
  // picking a group and also hand-adding an extra individual member
  // doesn't silently drop the group association.
  const assignedGroupId = groupIds.length === 1 ? groupIds[0] : null;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      priority,
      due_date: dueDate,
      created_by: member.id,
      assigned_group_id: assignedGroupId,
      parent_task_id: parentTaskId,
    })
    .select("id")
    .single();

  if (error || !task) {
    tasksUrl.searchParams.set("error", error?.message ?? "Could not create task.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  if (assigneeIds.length > 0) {
    await supabase
      .from("task_assignees")
      .insert(assigneeIds.map((memberId) => ({ task_id: task.id, member_id: memberId })));

    if (notifyEnabled) {
      await notifyMany(assigneeIds, {
        eventType: "assigned",
        taskId: task.id,
        actorId: member.id,
        data: { taskTitle: title, dueDate, priority },
      });
    }
  }

  tasksUrl.searchParams.set("created", title);
  return NextResponse.redirect(tasksUrl, { status: 303 });
}
