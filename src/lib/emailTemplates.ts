/**
 * Email copy and markup. Transport lives in ./email — this file only builds content.
 *
 * Styles are inline because most mail clients strip <style> blocks, and the hidden
 * preheader controls the preview line shown in the inbox list.
 */

export const FROM_NAME = "G'Spot";
export const SITE_URL = 'https://gspot.ge';
export const SETTINGS_URL = `${SITE_URL}/settings`;

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * `path` is the in-app route the notification points at (same routes the web
 * notification list links to). Null falls back to the home page.
 */
export function unseenNotificationEmail(notificationText: string, path: string | null): EmailContent {
  // the notification itself makes the best subject line — a generic one gets ignored,
  // and low engagement is what pushes a sender into the spam folder
  const subject = notificationText.length > 90
    ? `${notificationText.slice(0, 87)}...`
    : notificationText;

  const targetUrl = path ? `${SITE_URL}${path}` : SITE_URL;

  const html = `<!DOCTYPE html>
<html lang="ka">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#f6f6f6;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(notificationText)}</span>
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;">
      <div style="padding-bottom:20px;border-bottom:1px solid #eeeeee;">
        <span style="font-size:20px;font-weight:bold;color:#111111;">${FROM_NAME}</span>
      </div>
      <div style="padding:28px 0;">
        <p style="margin:0 0 16px;">გამარჯობა!</p>
        <p style="margin:0 0 20px;">შენ გაქვს ახალი შეტყობინება:</p>
        <div style="background:#f5f5f5;padding:20px;border-left:3px solid #111111;border-radius:4px;margin:0 0 24px;">
          ${escapeHtml(notificationText)}
        </div>
        <p style="margin:0;">
          <a href="${escapeHtml(targetUrl)}" style="display:inline-block;padding:12px 24px;background:#111111;color:#ffffff;text-decoration:none;border-radius:6px;">გახსენი ${FROM_NAME}</a>
        </p>
      </div>
      <div style="padding-top:20px;border-top:1px solid #eeeeee;font-size:13px;color:#888888;">
        <p style="margin:0 0 6px;">აღარ გინდა ასეთი წერილები? <a href="${SETTINGS_URL}" style="color:#888888;">გამორთე მეილის შეტყობინებები პარამეტრებში</a>.</p>
        <p style="margin:0 0 6px;">ეს წერილი ავტომატურად გაიგზავნა, პასუხის გაცემა არ არის საჭირო.</p>
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${FROM_NAME} · <a href="${SITE_URL}" style="color:#888888;">gspot.ge</a></p>
      </div>
    </div>
  </body>
</html>`;

  const text = `გამარჯობა!

შენ გაქვს ახალი შეტყობინება:

${notificationText}

გახსენი ${FROM_NAME}: ${targetUrl}

--
აღარ გინდა ასეთი წერილები? გამორთე მეილის შეტყობინებები პარამეტრებში: ${SETTINGS_URL}
${FROM_NAME} · ${SITE_URL}
ეს წერილი ავტომატურად გაიგზავნა, პასუხის გაცემა არ არის საჭირო.`;

  return {
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${SETTINGS_URL}>`,
    },
  };
}
