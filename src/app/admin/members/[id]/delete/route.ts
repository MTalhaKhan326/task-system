import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: memberId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const { data: adminMember } = await supabase
    .from("members")
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMember || adminMember.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const membersUrl = new URL("/admin/members", request.url);

  if (memberId === adminMember.id) {
    membersUrl.searchParams.set("error", "You can't delete your own account.");
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("members")
    .select("role, user_id")
    .eq("id", memberId)
    .maybeSingle();

  if (!target) {
    membersUrl.searchParams.set("error", "Member not found.");
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  if (target.role === "admin") {
    const { count } = await admin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      membersUrl.searchParams.set("error", "Can't delete the last remaining admin.");
      return NextResponse.redirect(membersUrl, { status: 303 });
    }
  }

  // Fully removes this person: their Supabase Auth account (so a
  // future re-invite is a genuinely fresh signup, not a password they
  // still remember) and their members row. task_assignees,
  // task_comments, notifications, tasks.created_by, and
  // groups.created_by all detach via ON DELETE SET NULL rather than
  // cascading (migration 009), so historical records survive with the
  // member reference cleared instead of being destroyed.
  // group_members still cascades — a membership record has no meaning
  // to keep once the member is gone.
  if (target.user_id) {
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(target.user_id);
    if (authDeleteError) {
      membersUrl.searchParams.set("error", authDeleteError.message);
      return NextResponse.redirect(membersUrl, { status: 303 });
    }
  }

  const { error } = await admin.from("members").delete().eq("id", memberId);

  if (error) {
    membersUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  membersUrl.searchParams.set("deleted", "true");
  return NextResponse.redirect(membersUrl, { status: 303 });
}
