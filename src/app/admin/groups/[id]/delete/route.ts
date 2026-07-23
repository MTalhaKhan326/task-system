import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
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

  const groupsUrl = new URL("/admin/groups", request.url);

  // task_assignees has no FK to groups — it only references tasks and
  // members, and those rows are written once at "fan out" time when a
  // task is created or edited. Deleting a group cascades group_members
  // (its membership list) and nulls tasks.assigned_group_id (just a
  // provenance marker), but never touches task_assignees, so existing
  // assignments survive the group being deleted.
  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) {
    groupsUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(groupsUrl, { status: 303 });
  }

  groupsUrl.searchParams.set("deleted", "true");
  return NextResponse.redirect(groupsUrl, { status: 303 });
}
