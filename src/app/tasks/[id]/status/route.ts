import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");

  const tasksUrl = new URL("/tasks", request.url);

  if (!STATUSES.includes(status)) {
    tasksUrl.searchParams.set("error", "Invalid status.");
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
    .select("id");

  if (error) {
    tasksUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  if (!data || data.length === 0) {
    tasksUrl.searchParams.set("error", "That task isn't assigned to you.");
    return NextResponse.redirect(tasksUrl, { status: 303 });
  }

  return NextResponse.redirect(tasksUrl, { status: 303 });
}
