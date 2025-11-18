import { Handler } from '@netlify/functions';

type Body = {
  to: string;
  subject: string;
  content: string;
};

export const handler: Handler = async (event) => {
  try {
    if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) };
    const payload: Body = JSON.parse(event.body);
    if (!payload.to) return { statusCode: 400, body: JSON.stringify({ error: 'Missing recipient' }) };

    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@wkly.app';

    if (SENDGRID_API_KEY) {
      // Use SendGrid REST API
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SENDGRID_API_KEY}` },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: FROM_EMAIL },
          subject: payload.subject,
          content: [{ type: 'text/plain', value: payload.content }],
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { statusCode: 502, body: JSON.stringify({ error: 'SendGrid failed', detail: text }) };
      }
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // No SendGrid configured — simulate success for testing.
    console.log('Simulated email send to', payload.to, 'subject', payload.subject);
    return { statusCode: 200, body: JSON.stringify({ ok: true, simulated: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err?.message || err) }) };
  }
};
