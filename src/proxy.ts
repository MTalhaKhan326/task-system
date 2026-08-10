import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session cookie if needed. Do not add logic between
  // createServerClient and this call, and do not remove getClaims().
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!claims) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", claims.sub)
      .maybeSingle();

    if (member?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Two-factor authentication is required for admins. nextLevel is
    // 'aal2' only once a verified TOTP factor exists on the account.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal) {
      if (aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/login/verify";
        url.searchParams.set("redirectTo", request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }

      if (aal.nextLevel !== "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/profile";
        url.search = "";
        url.searchParams.set(
          "message",
          "Two-factor authentication is required for admin accounts. Set it up below."
        );
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
