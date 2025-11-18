import { Handler } from '@netlify/functions';

type EventBody = {
  webhookUrl?: string;
  message: string;
};

export const handler: Handler = async (event) => {
  try {
    if (!event.body) return { statusCode: 400, body: JSON.stringify({ error: 'Missing body' }) };
    const payload: EventBody = JSON.parse(event.body);
    const webhookUrl = payload.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return { statusCode: 400, body: JSON.stringify({ error: 'No webhook URL configured' }) };

    // Post to Slack using fetch. In production, keep webhook URL secret and use environment variables.
    const res = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: payload.message }) });
    if (!res.ok) {
      const text = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: 'Slack webhook failed', detail: text }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err?.message || err) }) };
  }
};
