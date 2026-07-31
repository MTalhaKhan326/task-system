import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/email/notify";

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
    .select("id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "admin") {
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

  // Deleting a member now removes the row entirely (migration 009), so
  // normally no row exists here at all for a re-invite. This only
  // catches leftovers from before that change — a 'disabled' row from
  // the old soft-delete model. Clean it up (and its old auth account,
  // if any) so the insert below creates a genuinely fresh row, same as
  // any new invite.
  const { data: existing } = await admin
    .from("members")
    .select("id, status, user_id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "disabled") {
      membersUrl.searchParams.set("error", "That email is already a member.");
      return NextResponse.redirect(membersUrl, { status: 303 });
    }

    if (existing.user_id) {
      await admin.auth.admin.deleteUser(existing.user_id);
    }
    await admin.from("members").delete().eq("id", existing.id);
  }

  const { data: newMember, error } = await admin
    .from("members")
    .insert({ email, status: "pending" })
    .select("id")
    .single();

  if (error || !newMember) {
    membersUrl.searchParams.set(
      "error",
      error?.code === "23505" ? "That email is already a member." : error?.message ?? "Could not invite member."
    );
    return NextResponse.redirect(membersUrl, { status: 303 });
  }

  await notify({
    eventType: "invited",
    taskId: null,
    actorId: member.id,
    recipientId: newMember.id,
    data: { email },
  });

  membersUrl.searchParams.set("invited", email);
  return NextResponse.redirect(membersUrl, { status: 303 });
}
