import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: target } = await supabase
    .from("members")
    .select("role")
    .eq("id", memberId)
    .maybeSingle();

  if (!target) {
    membersUrl.searchParams.set("error", "Member not found.");
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  if (target.role === "admin") {
    const { count } = await supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("status", "disabled");

    if ((count ?? 0) <= 1) {
      membersUrl.searchParams.set("error", "Can't delete the last remaining admin.");
      return NextResponse.redirect(membersUrl, { status: 303 });
    }
  }

  const { error } = await supabase
    .from("members")
    .update({ status: "disabled" })
    .eq("id", memberId);

  if (error) {
    membersUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  membersUrl.searchParams.set("deleted", "true");
  return NextResponse.redirect(membersUrl, { status: 303 });
}
