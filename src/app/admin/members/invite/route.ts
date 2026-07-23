import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (member?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const membersUrl = new URL("/admin/members", request.url);

  if (!email) {
    membersUrl.searchParams.set("error", "Email is required.");
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("members").insert({ email, status: "pending" });

  if (error) {
    membersUrl.searchParams.set(
      "error",
      error.code === "23505" ? "That email is already a member." : error.message
    );
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  membersUrl.searchParams.set("invited", email);
  return NextResponse.redirect(membersUrl, { status: 303 });
}
