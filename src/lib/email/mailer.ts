import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

// Constructed lazily (not at module load) so missing/invalid SMTP config
// surfaces as a caught send failure inside notify() — logged to
// notifications — rather than crashing every route that imports this
// module, which would break "never fail the mutation."
export function getMailTransporter(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    return null;
  }

  if (!transporter) {
    const port = Number(SMTP_PORT);
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }

  return transporter;
}

// New env vars — not in CLAUDE.md's original list. Add to .env.local:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM_ADDRESS
// (falls back to SMTP_USER if EMAIL_FROM_ADDRESS isn't set, since
// most SMTP providers require the From address to match the
// authenticated account anyway).
export const EMAIL_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS ?? process.env.SMTP_USER ?? "";
