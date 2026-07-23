import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.redirect(tasksUrl, { status: 303 });
}
