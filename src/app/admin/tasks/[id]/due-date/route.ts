import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyMany } from "@/lib/email/notify";

// JSON in/out (not a form redirect) — this is called from the calendar's
// drag-and-drop client component via fetch(), not a page navigation.
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

  const { data: adminMember } = await supabase
    .from("members")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMember || adminMember.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const dueDate = body?.dueDate;

  if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
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

  if (task) {
    const recipientIds = (task.task_assignees ?? [])
      .map((row) => row.member_id)
      .filter((id): id is string => id !== null);

    if (recipientIds.length > 0) {
      await notifyMany(recipientIds, {
        eventType: "updated",
        taskId,
        actorId: adminMember.id,
        data: { taskTitle: task.title, dueDate },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
