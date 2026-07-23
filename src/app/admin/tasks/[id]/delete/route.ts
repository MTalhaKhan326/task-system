import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMany } from "@/lib/email/notify";

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
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMember || adminMember.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("title, task_assignees(member_id)")
    .eq("id", taskId)
    .maybeSingle();

  await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId);

  if (task) {
    const assigneeIds = (task.task_assignees ?? []).map((row) => row.member_id);
    if (assigneeIds.length > 0) {
      await notifyMany(assigneeIds, {
        eventType: "deleted",
        taskId,
        actorId: adminMember.id,
        data: { taskTitle: task.title },
      });
    }
  }

  return NextResponse.redirect(new URL("/admin/tasks", request.url), { status: 303 });
}
