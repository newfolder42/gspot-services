"use server";

type EmailProvider = 'resend' | 'console';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text: string | null;
}

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'console') as EmailProvider;
const FROM_EMAIL = 'auth@gspot.ge';
const FROM_NAME = "G'Spot";

async function sendViaConsole(options: EmailOptions): Promise<void> {
    console.log('📧 [EMAIL - Console Mode]');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML:', options.html);
    console.log('Text:', options.text || '');
    console.log('---');
}

async function sendViaResend(options: EmailOptions): Promise<void> {
    const key = process.env.EMAIL_PROVIDER_KEY;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
    }
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        switch (EMAIL_PROVIDER) {
            case 'resend':
                await sendViaResend(options);
                break;
            case 'console':
            default:
                await sendViaConsole(options);
                break;
        }
        return true;
    } catch (err) {
        console.log('sendEmail error', err);
        return false;
    }
}

export async function sendUnseenNotification(email: string, notificationText: string): Promise<boolean> {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 3px solid #000; }
          .content { padding: 30px 0; }
          .notification-text { background: #f5f5f5; padding: 20px; border-left: 4px solid #000; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; font-size: 12px; color: #666; margin-top: 30px; }
          .button { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>
            ${FROM_NAME}
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align: middle;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </h1>
          </div>
          <div class="content">
            <p>შენ გაქვს წაუკითხავი ნოთიფიკაცია!</p>
            <div class="notification-text">
              ${notificationText}
            </div>
            <a href="https://gspot.ge" class="button">→ გახსენით G'Spot</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${FROM_NAME}. ყველა უფლება დაცულია.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    return sendEmail({
        to: email,
        subject: `${FROM_NAME} 🔔 წაუკითხავი ნოთიფიკაცია`,
        html,
        text: null,
    });
}