import type { Handler } from '@netlify/functions'

const MAILGUN_API_BASE = 'https://api.mailgun.net/v3'

const buildHtml = ({ type, name, url }: { type: string; name?: string; url?: string }) => {
  const title = type === 'reset' ? 'Reset your Wkly password' : 'Confirm your Wkly account'
  const body = type === 'reset'
    ? `Click the button below to reset your password.`
    : `Click the button below to confirm your account and finish signing up.`

  return `
    <html>
      <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:24px;">
        <h2 style="margin-bottom:8px">${title}</h2>
        <p style="margin-top:0">Hi ${name || ''},</p>
        <p>${body}</p>
        <p style="margin:24px 0"><a href="${url || '#'}" style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">${type === 'reset' ? 'Reset password' : 'Confirm account'}</a></p>
        <p style="font-size:13px;color:#6b7280">If you didn't request this, you can safely ignore this email.</p>
      </body>
    </html>`
}

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN || !process.env.FROM_EMAIL) {
      return { statusCode: 500, body: 'Server misconfigured: missing MAILGUN_API_KEY, MAILGUN_DOMAIN or FROM_EMAIL' }
    }

    const payload = JSON.parse(event.body || '{}')
    const { email, name, url, type } = payload

    if (!email || !type) {
      return { statusCode: 400, body: 'Missing required fields: email and type' }
    }

    const subject = type === 'reset' ? 'Reset your Wkly password' : 'Confirm your Wkly account'
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
