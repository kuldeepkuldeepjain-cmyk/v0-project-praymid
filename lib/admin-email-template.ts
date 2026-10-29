export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }

    return entities[character]
  })
}

export function plainTextToEmailHtml(message: string) {
  return message
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        ? `<p style="margin:0 0 16px;line-height:1.7;">${escapeEmailHtml(line)}</p>`
        : '<p style="margin:0 0 12px;line-height:1.7;">&nbsp;</p>',
    )
    .join("")
}

export function createBrandedEmailHtml(subject: string, bodyHtml: string) {
  const safeSubject = escapeEmailHtml(subject)
  const year = new Date().getFullYear()

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#334155;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeSubject}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background-color:#f1f5f9;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background-color:#ffffff;border:1px solid #f1f5f9;border-collapse:separate;border-spacing:0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background-color:#10243a;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td>
                      <p style="margin:0 0 6px;color:#14b8a6;font-size:12px;font-weight:700;letter-spacing:2px;">ELITE FUND</p>
                      <p style="margin:0;color:#ffffff;font-size:14px;line-height:1.5;">Official account notification</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#334155;">${bodyHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f1f5f9;">
                <p style="margin:0 0 6px;color:#334155;font-size:12px;line-height:1.6;">This email was sent by Elite Fund.</p>
                <p style="margin:0;color:#334155;font-size:12px;line-height:1.6;">&copy; ${year} Elite Fund. Please contact support through your account if you need assistance.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
