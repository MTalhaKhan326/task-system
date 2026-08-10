import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaChallengeForm } from "@/components/MfaChallengeForm";

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified") ?? null;
  const challenge = factor
    ? await supabase.auth.mfa.challenge({ factorId: factor.id })
    : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-lg border border-cream-dark bg-white p-8">
        <h1 className="mb-2 font-display text-3xl tracking-wide text-ink uppercase">
          Verify it&rsquo;s you
        </h1>
        <p className="mb-6 text-sm text-ink/70">
          Enter the 6-digit code from your authenticator app to finish logging in.
        </p>

        {factor && challenge?.data ? (
          <MfaChallengeForm
            factorId={factor.id}
            initialChallengeId={challenge.data.id}
            redirectTo={params.redirectTo ?? "/"}
          />
        ) : (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No two-factor method found on this account. Please contact an admin.
          </p>
        )}
      </div>
    </div>
  );
}
