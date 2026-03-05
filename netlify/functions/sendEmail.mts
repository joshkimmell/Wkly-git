import type { Handler } from '@netlify/functions'

const MAILGUN_API_BASE = 'https://api.mailgun.net/v3'

const buildHtml = ({ type, name, url }: { type: string; name?: string; url?: string }) => {
  let title: string;
  let body: string;
  let buttonText: string;

  if (type === 'reset') {
    title = 'Reset your Wkly password';
    body = 'Click the button below to reset your password.';
    buttonText = 'Reset password';
  } else if (type === 'approval') {
    title = 'Your Wkly access has been approved!';
    body = 'Great news! Your request for access to Wkly has been approved. You can now create your account and start using the app.';
    buttonText = 'Create account';
  } else {
    title = 'Confirm your Wkly account';
    body = 'Click the button below to confirm your account and finish signing up.';
    buttonText = 'Confirm account';
  }

  return `
    <html>
      <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:24px;">
        <h2 style="margin-bottom:8px">${title}</h2>
        <p style="margin-top:0">Hi ${name || ''},</p>
        <p>${body}</p>
        <p style="margin:24px 0"><a href="${url || '#'}" style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">${buttonText}</a></p>
        <p style="font-size:13px;color:#6b7280">If you didn't request this, you can safely ignore this email.</p>
      </body>
    </html>`
}

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const apiKey = event.headers?.['x-api-key'] || event.headers?.['X-Api-Key'] || '';
    if (!process.env.MAILER_API_KEY || apiKey !== process.env.MAILER_API_KEY) {
      return { statusCode: 401, body: 'Unauthorized' }
    }

    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.FROM_EMAIL) {
      return { statusCode: 500, body: 'Server misconfigured: missing MAILGUN_API_KEY, MAILGUN_DOMAIN or FROM_EMAIL' }
    }

    const payload = JSON.parse(event.body || '{}')
    const { email, name, url, type } = payload

    if (!email || !type) {
      return { statusCode: 400, body: 'Missing required fields: email and type' }
    }

    let subject: string;
    if (type === 'reset') {
      subject = 'Reset your Wkly password';
    } else if (type === 'approval') {
      subject = 'Your Wkly access has been approved!';
    } else {
      subject = 'Confirm your Wkly account';
    }
    
    const bodyHtml = buildHtml({ type, name, url })

    const mgUrl = `${MAILGUN_API_BASE}/${process.env.MAILGUN_DOMAIN}/messages`

    const params = new URLSearchParams()
    params.append('from', `${process.env.FROM_EMAIL}`)
    params.append('to', email)
    params.append('subject', subject)
    params.append('html', bodyHtml)

    const auth = 'Basic ' + Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')

    const res = await fetch(mgUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!res.ok) {
      const text = await res.text()
      return { statusCode: 502, body: `Mailgun error: ${text}` }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    return { statusCode: 500, body: String(err?.message || err) }
  }
}

export { handler }
