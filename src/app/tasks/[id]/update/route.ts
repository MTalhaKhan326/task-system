import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify, notifyMany } from "@/lib/email/notify";

// Member-facing task edit — only the task's own creator can fully edit
// it (title/description/priority/due date/assignees). A member who's
// merely assigned to a task someone else created can only change its
// status, via /tasks/[id]/status — that route is unaffected by this one.
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
  const notifyEnabled = String(formData.get("notify") ?? "true") !== "false";

  const referer = request.headers.get("referer");
  let tasksUrl = new URL("/tasks", request.url);
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === new URL(request.url).origin) {
        tasksUrl = refererUrl;
        tasksUrl.searchParams.delete("error");
        tasksUrl.searchParams.delete("created");
        tasksUrl.searchParams.delete("updated");
      }
    } catch {}
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("created_by")
    .eq("id", taskId)
    .maybeSingle();

  if (!task || task.created_by !== member.id) {
    tasksUrl.searchParams.set("error", "You can only edit tasks you created.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
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
  const unchanged = [...currentIds].filter((id) => desiredIds.has(id));

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

  if (notifyEnabled) {
    await Promise.all([
      ...toAdd.map((recipientId) =>
        notify({
          eventType: "reassigned",
          taskId,
          actorId: member.id,
          recipientId,
          data: { taskTitle: title, change: "added" },
        })
      ),
      ...toRemove.map((recipientId) =>
        notify({
          eventType: "reassigned",
          taskId,
          actorId: member.id,
          recipientId,
          data: { taskTitle: title, change: "removed" },
        })
      ),
      unchanged.length > 0
        ? notifyMany(unchanged, {
            eventType: "updated",
            taskId,
            actorId: member.id,
            data: { taskTitle: title, dueDate },
          })
        : Promise.resolve(),
    ]);
  }

  tasksUrl.searchParams.set("updated", title);
  return NextResponse.redirect(tasksUrl, { status: 303 });
}
