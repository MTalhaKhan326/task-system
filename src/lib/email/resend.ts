import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

// Not in the original .env.local list — add RESEND_FROM_EMAIL there with
// a verified sending address. Falls back to Resend's sandbox address so
// local dev doesn't crash without it, but that sandbox address can only
// send to the Resend account's own verified email.
export const EMAIL_FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
