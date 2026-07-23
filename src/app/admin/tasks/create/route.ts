import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const { data: adminMember } = await supabase
    .from("members")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMember || adminMember.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const priority = String(formData.get("priority") ?? "medium");
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const memberIds = formData.getAll("memberIds").map(String);
  const groupIds = formData.getAll("groupIds").map(String);

  const tasksUrl = new URL("/admin/tasks", request.url);

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
  const assignedGroupId = groupIds.length === 1 && memberIds.length === 0 ? groupIds[0] : null;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      priority,
      due_date: dueDate,
      created_by: adminMember.id,
      assigned_group_id: assignedGroupId,
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
  }

  tasksUrl.searchParams.set("created", title);
  return NextResponse.redirect(tasksUrl, { status: 303 });
}
