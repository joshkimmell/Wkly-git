import { Handler } from '@netlify/functions';
import { requireAuth } from './lib/auth';

const MAILGUN_API_BASE = 'https://api.mailgun.net/v3';

type Body = {
  to: string;
  subject: string;
  content: string;
};

export const handler: Handler = async (event) => {
  try {
    console.log('[sendTestEmail] Function called');
    const auth = await requireAuth(event);
    if (auth.error) {
      console.log('[sendTestEmail] Auth failed');
      return auth.error;
    }

    if (!event.body) {
      console.log('[sendTestEmail] Missing body');
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) };
    }
    const payload: Body = JSON.parse(event.body);
    console.log('[sendTestEmail] Payload:', { to: payload.to, subject: payload.subject });
    if (!payload.to) return { statusCode: 400, body: JSON.stringify({ error: 'Missing recipient' }) };

    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.FROM_EMAIL) {
      console.error('[sendTestEmail] Missing Mailgun configuration');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server misconfigured: missing MAILGUN_API_KEY, MAILGUN_DOMAIN or FROM_EMAIL',
          note: 'Please configure Mailgun environment variables'
        }),
      };
    }

    console.log('[sendTestEmail] Using Mailgun');
    const FROM_EMAIL = process.env.FROM_EMAIL;

    // Build simple HTML email
    const bodyHtml = `
      <html>
        <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:24px; max-width:600px; margin:0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin:0; font-size:24px;">${payload.subject}</h2>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p style="margin:16px 0; color:#374151; line-height:1.6;">${payload.content}</p>
            <p style="font-size:13px; color:#9ca3af; margin-top:24px; margin-bottom:0;">
              This is a test email from Wkly to verify your email configuration is working correctly.
            </p>
          </div>
        </body>
      </html>
    `;

    const mgUrl = `${MAILGUN_API_BASE}/${process.env.MAILGUN_DOMAIN}/messages`;

    const params = new URLSearchParams();
    params.append('from', `Wkly Test <${FROM_EMAIL}>`);
    params.append('to', payload.to);
    params.append('subject', payload.subject);
    params.append('html', bodyHtml);

    const auth_header = 'Basic ' + Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64');

    const res = await fetch(mgUrl, {
      method: 'POST',
      headers: {
        Authorization: auth_header,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[sendTestEmail] Mailgun error:', text);
      return { statusCode: 502, body: JSON.stringify({ error: 'Mailgun error', detail: text }) };
    }

    console.log('[sendTestEmail] Email sent successfully via Mailgun');
    return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'Test email sent via Mailgun' }) };
  } catch (err: any) {
    console.error('[sendTestEmail] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err?.message || err) }) };
  }
};
