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

  const tasksUrl = new URL("/tasks", request.url);

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    tasksUrl.searchParams.set("error", "No member profile found for this account.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  const formData = await request.formData();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    tasksUrl.searchParams.set("error", "Comment can't be empty.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  const { error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, member_id: member.id, body });

  if (error) {
    tasksUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("title, created_by, task_assignees(member_id)")
    .eq("id", taskId)
    .maybeSingle();

  if (task) {
    const recipientIds = Array.from(
      new Set([
        task.created_by,
        ...(task.task_assignees ?? []).map((row) => row.member_id),
      ])
    ).filter((id): id is string => id !== null);

    await notifyMany(recipientIds, {
      eventType: "comment",
      taskId,
      actorId: member.id,
      data: { taskTitle: task.title, body },
    });
  }

  return NextResponse.redirect(tasksUrl, { status: 303 });
}
