import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const rawRedirectTo = String(formData.get("redirectTo") ?? "/");
  // Only allow same-app relative paths — never let a query param send the
  // user's session off to an external origin after login.
  const redirectTo =
    rawRedirectTo.startsWith("/") && !rawRedirectTo.startsWith("//") ? rawRedirectTo : "/";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // TEMPORARY DEBUG — remove once the deployed "Invalid API key" issue
    // is diagnosed. Check Vercel → Deployments → (this deployment) →
    // Logs (or Runtime Logs) for these lines after attempting a login.
    // Never logs the actual secret value — only presence/shape.
    const url_env = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const key_env = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
    console.error("DEBUG login error:", {
      message: error.message,
      status: error.status,
      name: error.name,
      code: (error as { code?: string }).code,
    });
    console.error("DEBUG NEXT_PUBLIC_SUPABASE_URL:", url_env || "(empty/undefined)");
    console.error("DEBUG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY length:", key_env.length);
    console.error(
      "DEBUG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY prefix:",
      key_env.slice(0, 15) || "(empty/undefined)"
    );

    const url = new URL("/login", request.url);
    url.searchParams.set("error", error.message);
    url.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(url, { status: 303 });
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    const url = new URL("/login/verify", request.url);
    url.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(url, { status: 303 });
  }

  return NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 });
}
