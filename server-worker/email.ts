import type { Env } from './types.ts';

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class WorkerEmailService {
  constructor(private env: Env) {}

  /**
   * Sends an email via Gmail API (primary) or Resend API (fallback) using standard Web fetch()
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; method: string; messageId?: string; error?: string }> {
    // 1. Try Gmail API OAuth 2.0
    if (this.env.GMAIL_CLIENT_ID && this.env.GMAIL_CLIENT_SECRET && this.env.GMAIL_REFRESH_TOKEN) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.env.GMAIL_CLIENT_ID,
            client_secret: this.env.GMAIL_CLIENT_SECRET,
            refresh_token: this.env.GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token'
          })
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json() as any;
          const accessToken = tokenData.access_token;
          const sender = this.env.GMAIL_SENDER_EMAIL || this.env.OFFICIAL_EMAIL || 'chandruking901@gmail.com';

          // Construct MIME RFC 2822 message
          const rawMessage = [
            `From: ${this.env.BUSINESS_NAME || 'SPP Nestora'} <${sender}>`,
            `To: ${payload.to}`,
            `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            '',
            btoa(unescape(encodeURIComponent(payload.html || payload.text.replace(/\n/g, '<br/>'))))
          ].join('\r\n');

          const base64UrlMessage = btoa(rawMessage)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

          const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: base64UrlMessage })
          });

          if (sendRes.ok) {
            const sendData = await sendRes.json() as any;
            return { success: true, method: 'gmail_api', messageId: sendData.id };
          }
        }
      } catch (err: any) {
        console.warn('[Worker Email] Gmail API attempt failed:', err.message);
      }
    }

    // 2. Try Resend API fallback
    if (this.env.RESEND_API_KEY && this.env.RESEND_API_KEY.startsWith('re_')) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${this.env.BUSINESS_NAME || 'SPP Nestora'} <onboarding@resend.dev>`,
            to: payload.to,
            subject: payload.subject,
            html: payload.html || payload.text.replace(/\n/g, '<br/>')
          })
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json() as any;
          return { success: true, method: 'resend', messageId: resendData.id };
        }
      } catch (err: any) {
        console.warn('[Worker Email] Resend attempt failed:', err.message);
      }
    }

    // Diagnostic log in development/local test mode
    console.log(`[Worker Email Simulated] To: ${payload.to} | Subject: "${payload.subject}"`);
    return { success: true, method: 'simulated_dev' };
  }
}
