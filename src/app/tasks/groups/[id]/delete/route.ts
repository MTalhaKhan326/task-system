import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Member-facing group delete — only a group's own creator can delete it.
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
    groupsUrl.searchParams.set("error", "You can only delete groups you created.");
    return NextResponse.redirect(groupsUrl, { status: 303 });
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) {
    groupsUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(groupsUrl, { status: 303 });
  }

  groupsUrl.searchParams.set("deleted", "true");
  return NextResponse.redirect(groupsUrl, { status: 303 });
}
