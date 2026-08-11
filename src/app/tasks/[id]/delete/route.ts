import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMany } from "@/lib/email/notify";

// Member-facing task delete — only the task's own creator can delete it.
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

  const referer = request.headers.get("referer");
  let tasksUrl = new URL("/tasks", request.url);
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === new URL(request.url).origin) {
        tasksUrl = refererUrl;
        tasksUrl.searchParams.delete("error");
        tasksUrl.searchParams.delete("deleted");
      }
    } catch {}
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("title, created_by, task_assignees(member_id)")
    .eq("id", taskId)
    .maybeSingle();

  if (!task || task.created_by !== member.id) {
    tasksUrl.searchParams.set("error", "You can only delete tasks you created.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId);

  const assigneeIds = (task.task_assignees ?? []).map((row) => row.member_id);
  if (assigneeIds.length > 0) {
    await notifyMany(assigneeIds, {
      eventType: "deleted",
      taskId,
      actorId: member.id,
      data: { taskTitle: task.title },
    });
  }

  tasksUrl.searchParams.set("deleted", "true");
  return NextResponse.redirect(tasksUrl, { status: 303 });
}
