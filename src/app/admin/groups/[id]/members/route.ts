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

  const formData = await request.formData();
  const memberIds = formData.getAll("memberIds").map(String);
  const desiredIds = new Set(memberIds);

  const { data: currentRows } = await supabase
    .from("group_members")
    .select("member_id")
    .eq("group_id", groupId);

  const currentIds = new Set((currentRows ?? []).map((row) => row.member_id));

  const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

  // Membership changes only ever touch group_members. They never touch
  // task_assignees, so removing someone from a group here doesn't undo
  // assignments already fanned out to them from past tasks.
  if (toAdd.length > 0) {
    await supabase
      .from("group_members")
      .insert(toAdd.map((memberId) => ({ group_id: groupId, member_id: memberId })));
  }

  if (toRemove.length > 0) {
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .in("member_id", toRemove);
  }

  const groupsUrl = new URL("/admin/groups", request.url);
  groupsUrl.searchParams.set("updated", "membership");
  return NextResponse.redirect(groupsUrl, { status: 303 });
}
