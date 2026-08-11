import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Member-facing membership edit — only a group's own creator can manage
// who's in it.
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

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const groupsUrl = new URL("/tasks/groups", request.url);

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || group.created_by !== member.id) {
    groupsUrl.searchParams.set("error", "You can only manage groups you created.");
    return NextResponse.redirect(groupsUrl, { status: 303 });
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

  groupsUrl.searchParams.set("updated", "membership");
  return NextResponse.redirect(groupsUrl, { status: 303 });
}
