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

  // email is unique, and deleting a member only ever sets status to
  // 'disabled' — the row still exists — so re-inviting the same
  // address has to reactivate that row instead of inserting a
  // duplicate, which would otherwise just fail with "already a
  // member" forever.
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

    // If they'd already signed up before being deleted, their auth
    // account and password still work — reactivate straight to
    // 'active' rather than making them sign up again. Only send the
    // invite email when they actually need the signup link (still
    // 'pending') — someone going straight back to 'active' already
    // has an account and just needs to log in.
    const reactivatedStatus = existing.user_id ? "active" : "pending";
    const { error: reactivateError } = await admin
      .from("members")
      .update({ status: reactivatedStatus })
      .eq("id", existing.id);

    if (reactivateError) {
      membersUrl.searchParams.set("error", reactivateError.message);
      return NextResponse.redirect(membersUrl, { status: 303 });
    }

    if (reactivatedStatus === "pending") {
      await notify({
        eventType: "invited",
        taskId: null,
        actorId: member.id,
        recipientId: existing.id,
        data: { email },
      });
    }

    membersUrl.searchParams.set("invited", email);
    return NextResponse.redirect(membersUrl, { status: 303 });
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
