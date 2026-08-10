"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EnrollState = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function TwoFactorSetup({
  initialVerifiedFactorId,
}: {
  initialVerifiedFactorId: string | null;
}) {
  const supabase = createClient();
  const [verifiedFactorId, setVerifiedFactorId] = useState(initialVerifiedFactorId);
  const [enroll, setEnroll] = useState<EnrollState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleEnable() {
    setError(null);
    setBusy(true);

    // Clean up any abandoned enrollment (e.g. the QR code never got
    // confirmed last time) — Supabase rejects a fresh enroll() while an
    // unverified factor with the same name already exists.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale =
      existing?.all.filter((f) => f.factor_type === "totp" && f.status === "unverified") ?? [];
    for (const factor of stale) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (enrollError) {
      setError(enrollError.message);
      return;
    }
    setEnroll({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function handleConfirm() {
    if (!enroll) return;
    setError(null);
    setBusy(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enroll.factorId,
    });
    if (challengeError) {
      setBusy(false);
      setError(challengeError.message);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setVerifiedFactorId(enroll.factorId);
    setEnroll(null);
    setCode("");
  }

  async function handleCancelEnroll() {
    if (!enroll) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    setBusy(false);
    setEnroll(null);
    setCode("");
    setError(null);
  }

  async function handleDisable() {
    if (!verifiedFactorId) return;
    if (!window.confirm("Disable two-factor authentication on your account?")) return;
    setError(null);
    setBusy(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactorId,
    });
    setBusy(false);
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    setVerifiedFactorId(null);
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {verifiedFactorId && !enroll && (
        <div>
          <p className="mb-3 text-sm text-ink/70">
            Two-factor authentication is <span className="font-medium text-brand">enabled</span> on
            your account.
          </p>
          <button
            type="button"
            onClick={handleDisable}
            disabled={busy}
            className="rounded border border-cream-dark px-4 py-2 text-sm text-ink/80 hover:bg-cream-mid disabled:opacity-50"
          >
            Disable two-factor authentication
          </button>
        </div>
      )}

      {!verifiedFactorId && !enroll && (
        <div>
          <p className="mb-3 text-sm text-ink/70">
            Two-factor authentication is <span className="font-medium">not enabled</span>. Protect
            your account with an authenticator app such as Google Authenticator or Authy.
          </p>
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="rounded-full bg-brand px-5 py-2 text-sm text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            Enable two-factor authentication
          </button>
        </div>
      )}

      {enroll && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink/70">
            Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enroll.qrCode}
            alt="Two-factor authentication QR code"
            className="h-40 w-40 self-start rounded border border-cream-dark bg-white p-2"
          />
          <p className="text-xs text-ink/50">
            Can&rsquo;t scan it? Enter this code manually:{" "}
            <span className="font-mono text-ink/80">{enroll.secret}</span>
          </p>

          <label className="flex flex-col gap-1 text-sm text-ink/80">
            6-digit code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.trim())}
              maxLength={6}
              className="w-32 rounded border border-cream-dark px-3 py-2"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy || code.length !== 6}
              className="rounded-full bg-brand px-5 py-2 text-sm text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={handleCancelEnroll}
              disabled={busy}
              className="rounded border border-cream-dark px-4 py-2 text-sm text-ink/80 hover:bg-cream-mid disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
