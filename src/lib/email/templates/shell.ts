// Not in the original .env.local list — add APP_URL there once deployed
// (e.g. https://tasks.eternity-healthclub.com). Falls back to localhost
// for local dev so links still work while testing.
export const APP_URL = (process.env.APP_URL ?? "https://task-system-roan.vercel.app/").replace(/\/$/, "");

export function emailShell(
  preheader: string,
  bodyHtml: string,
  cta: { url: string; label: string } = { url: `${APP_URL}/tasks`, label: "View in portal" }
) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:sans-serif;">
    <span style="display:none;font-size:1px;color:#f4f4f5;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;padding:32px;">
            <tr>
              <td style="font-size:14px;color:#18181b;line-height:1.5;">
                ${bodyHtml}
                <p style="margin:24px 0 0;">
                  <a
                    href="${cta.url}"
                    style="display:inline-block;background-color:#18181b;color:#ffffff;padding:10px 20px;border-radius:9999px;text-decoration:none;font-size:14px;"
                  >
                    ${cta.label}
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
