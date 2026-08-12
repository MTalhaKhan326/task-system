import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/email/notify";

const STATUSES = ["todo", "doing", "done"];

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

  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");

  const referer = request.headers.get("referer");
  let tasksUrl = new URL("/tasks", request.url);
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === new URL(request.url).origin) {
        tasksUrl = refererUrl;
        tasksUrl.searchParams.delete("error");
      }
    } catch {}
  }

  if (!STATUSES.includes(status)) {
    tasksUrl.searchParams.set("error", "Invalid status.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  // Once a task is done, only its creator (or an admin, via the
  // separate /admin/tasks/[id]/status route) can move it again — a
  // plain assignee can't reopen or otherwise touch a completed task.
  const { data: existing } = await supabase
    .from("tasks")
    .select("status, created_by")
    .eq("id", taskId)
    .maybeSingle();

  if (existing?.status === "done" && existing.created_by !== member?.id) {
    tasksUrl.searchParams.set(
      "error",
      "This task is done — only its creator or an admin can change its status now."
    );
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  // This runs on the member's own session (RLS-scoped), and the update
  // payload is a literal object with only the status field — never the
  // raw form body — so no other column can be smuggled in here even if
  // a request is crafted by hand. RLS ("members update status on
  // assigned tasks") and a DB trigger both also reject non-status
  // changes from non-admins, but this route doesn't rely on either as
  // the only line of defense.
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .select("id, title, created_by");

  if (error) {
    tasksUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  if (!data || data.length === 0) {
    tasksUrl.searchParams.set("error", "That task isn't assigned to you.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  if (member) {
    const task = data[0];
    await notify({
      eventType: "status_changed",
      taskId,
      actorId: member.id,
      recipientId: task.created_by,
      data: { taskTitle: task.title, status },
    });
  }

  return NextResponse.redirect(tasksUrl, { status: 303 });
}
