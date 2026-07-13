const BRAND = "English Class by Ali";

export function appUrl(path = "") {
  const base = process.env.APP_URL ?? "https://portalbyali.netlify.app";
  return `${base}${path}`;
}

// Table-based "bulletproof" button — renders correctly across Gmail,
// Outlook, and Apple Mail without relying on CSS the older clients strip.
export function emailButton(label: string, href: string) {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0;">
  <tr>
    <td align="center" bgcolor="#4f46e5" style="border-radius:8px;">
      <a href="${href}" target="_blank"
        style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

export function emailList(items: string[], emptyText: string) {
  if (items.length === 0) {
    return `<p style="margin:8px 0;color:#64748b;">${emptyText}</p>`;
  }
  return `<ul style="margin:8px 0;padding-left:20px;color:#334155;">${items
    .map((item) => `<li style="margin:4px 0;">${item}</li>`)
    .join("")}</ul>`;
}

export function renderEmail({
  heading,
  bodyHtml,
  preheader,
}: {
  heading: string;
  bodyHtml: string;
  preheader?: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellspacing="0" cellpadding="0"
            style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
            <tr>
              <td bgcolor="#4f46e5" style="background-color:#4f46e5;padding:22px 28px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">
                  ${BRAND}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;color:#1e293b;font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${heading}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#f8fafc;color:#94a3b8;font-size:12px;font-family:Arial,Helvetica,sans-serif;">
                You're receiving this because you have an account on the ${BRAND} student portal.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
