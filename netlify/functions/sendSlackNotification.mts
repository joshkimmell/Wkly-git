import { Handler } from '@netlify/functions';
import { requireAuth, withCors } from './lib/auth';

type EventBody = {
  message: string;
  webhookUrl?: string;
};

export const handler = withCors(async (event) => {
  try {
    const auth = await requireAuth(event);
    if (auth.error) return auth.error;

    if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) };
    const payload: EventBody = JSON.parse(event.body);
    
    // Use webhook URL from request body if provided, otherwise fall back to env var
    const webhookUrl = payload.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { statusCode: 400, body: JSON.stringify({ error: 'No webhook URL configured' }) };

    // Post to Slack using fetch
    const res = await fetch(webhookUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ text: payload.message }) 
    });
    
    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Slack webhook failed', detail: text }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err?.message || err) }) };
  }
});
