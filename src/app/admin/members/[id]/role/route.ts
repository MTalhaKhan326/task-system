import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["admin", "member"];

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
    membersUrl.searchParams.set("error", "You can't change your own role.");
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  const formData = await request.formData();
  const role = String(formData.get("role") ?? "");

  if (!ROLES.includes(role)) {
    membersUrl.searchParams.set("error", "Invalid role.");
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from("members")
    .select("role")
    .eq("id", memberId)
    .maybeSingle();

  if (!target) {
    membersUrl.searchParams.set("error", "Member not found.");
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  if (target.role === "admin" && role !== "admin") {
    const { count } = await admin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) <= 1) {
      membersUrl.searchParams.set("error", "Can't demote the last remaining admin.");
      return NextResponse.redirect(membersUrl, { status: 303 });
    }
  }

  const { error } = await admin.from("members").update({ role }).eq("id", memberId);

  if (error) {
    membersUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  membersUrl.searchParams.set("roleUpdated", "true");
  return NextResponse.redirect(membersUrl, { status: 303 });
}
