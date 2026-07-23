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

  const { data: adminMember } = await supabase
    .from("members")
    .select("role")
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

  await supabase.from("tasks").update({ status }).eq("id", taskId);

  return NextResponse.redirect(tasksUrl, { status: 303 });
}
