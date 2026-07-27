import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim() || null;

  const profileUrl = new URL("/profile", request.url);

  // Runs on the member's own session (RLS-scoped to their own row), and
  // the update payload is a literal object with only full_name — never
  // the raw form body — so no other column can be smuggled in here even
  // if a request is crafted by hand. RLS ("members update own
  // full_name") and a DB trigger both also reject changes to any other
  // column, but this route doesn't rely on either as the only line of
  // defense.
  const { data, error } = await supabase
    .from("members")
    .update({ full_name: fullName })
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    profileUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(profileUrl, { status: 303 });
  }

  if (!data || data.length === 0) {
    profileUrl.searchParams.set(
      "error",
      "Update was blocked — the profile update migration may not be applied yet."
    );
    return NextResponse.redirect(profileUrl, { status: 303 });
  }

  profileUrl.searchParams.set("updated", "true");
  return NextResponse.redirect(profileUrl, { status: 303 });
}
