"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function MfaChallengeForm({
  factorId,
  initialChallengeId,
  redirectTo,
}: {
  factorId: string;
  initialChallengeId: string;
  redirectTo: string;
}) {
  const supabase = createClient();
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    if (verifyError) {
      setError(verifyError.message);
      setCode("");
      // The challenge may have expired — get a fresh one for the retry.
      const { data: fresh } = await supabase.auth.mfa.challenge({ factorId });
      if (fresh) {
        setChallengeId(fresh.id);
      }
      setBusy(false);
      return;
    }
    const target = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
    window.location.href = target;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-ink/80">
        6-digit code from your authenticator app
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value.trim())}
          maxLength={6}
          autoFocus
          required
          className="rounded border border-cream-dark px-3 py-2 text-ink"
        />
      </label>

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="mt-2 rounded-full bg-brand px-5 py-2 text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        Verify
      </button>
    </form>
  );
}
