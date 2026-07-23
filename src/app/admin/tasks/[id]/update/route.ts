import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const { data: adminMember } = await supabase
    .from("members")
    .select("role")
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

  const desiredIds = new Set([...memberIds, ...groupMemberIds]);
  const assignedGroupId = groupIds.length === 1 && memberIds.length === 0 ? groupIds[0] : null;

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      title,
      description,
      priority,
      due_date: dueDate,
      assigned_group_id: assignedGroupId,
    })
    .eq("id", taskId);

  if (updateError) {
    tasksUrl.searchParams.set("error", updateError.message);
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  const { data: currentAssignees } = await supabase
    .from("task_assignees")
    .select("member_id")
    .eq("task_id", taskId);

  const currentIds = new Set((currentAssignees ?? []).map((row) => row.member_id));

  const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

  if (toAdd.length > 0) {
    await supabase
      .from("task_assignees")
      .insert(toAdd.map((memberId) => ({ task_id: taskId, member_id: memberId })));
  }

  if (toRemove.length > 0) {
    await supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .in("member_id", toRemove);
  }

  tasksUrl.searchParams.set("updated", title);
  return NextResponse.redirect(tasksUrl, { status: 303 });
}
