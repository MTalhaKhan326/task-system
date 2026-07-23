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

  const { data: adminMember } = await supabase
    .from("members")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMember || adminMember.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");

  const tasksUrl = new URL("/admin/tasks", request.url);

  if (!STATUSES.includes(status)) {
    tasksUrl.searchParams.set("error", "Invalid status.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  const { data: task } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .select("title, created_by")
    .maybeSingle();

  if (task) {
    await notify({
      eventType: "status_changed",
      taskId,
      actorId: adminMember.id,
      recipientId: task.created_by,
      data: { taskTitle: task.title, status },
    });
  }

  return NextResponse.redirect(tasksUrl, { status: 303 });
}
