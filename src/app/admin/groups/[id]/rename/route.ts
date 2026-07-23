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
  const name = String(formData.get("name") ?? "").trim();

  const groupsUrl = new URL("/admin/groups", request.url);

  if (!name) {
    groupsUrl.searchParams.set("error", "Name is required.");
    return NextResponse.redirect(groupsUrl, { status: 303 });
  }

  const { error } = await supabase.from("groups").update({ name }).eq("id", groupId);

  if (error) {
    groupsUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(groupsUrl, { status: 303 });
  }

  groupsUrl.searchParams.set("updated", name);
  return NextResponse.redirect(groupsUrl, { status: 303 });
}
