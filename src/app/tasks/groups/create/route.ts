import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Member-facing group creation. See supabase/migrations/012_member_task_
// and_group_creation.sql — a member-created group is visible only to its
// own members and to admins, not to the rest of the company.
export async function POST(request: NextRequest) {
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

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();

  const groupsUrl = new URL("/tasks/groups", request.url);

  if (!name) {
    groupsUrl.searchParams.set("error", "Name is required.");
    return NextResponse.redirect(groupsUrl, { status: 303 });
  }

  const { error } = await supabase.from("groups").insert({ name, created_by: member.id });

  if (error) {
    groupsUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(groupsUrl, { status: 303 });
  }

  groupsUrl.searchParams.set("created", name);
  return NextResponse.redirect(groupsUrl, { status: 303 });
}
