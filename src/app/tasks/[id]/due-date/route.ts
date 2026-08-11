import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMany } from "@/lib/email/notify";

// Member-facing calendar drag-and-drop — only the task's own creator can
// reschedule it (CalendarView already hides the drag handle for tasks a
// member can't edit, this is the server-side backstop).
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
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const dueDate = body?.dueDate;
  const notifyEnabled = body?.notify !== false;

  if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("tasks")
    .select("created_by")
    .eq("id", taskId)
    .maybeSingle();

  if (!existing || existing.created_by !== member.id) {
    return NextResponse.json({ error: "You can only reschedule tasks you created." }, { status: 403 });
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ due_date: dueDate })
    .eq("id", taskId)
    .select("title, task_assignees(member_id)")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (task && notifyEnabled) {
    const recipientIds = (task.task_assignees ?? [])
      .map((row) => row.member_id)
      .filter((id): id is string => id !== null);

    if (recipientIds.length > 0) {
      await notifyMany(recipientIds, {
        eventType: "updated",
        taskId,
        actorId: member.id,
        data: { taskTitle: task.title, dueDate },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
