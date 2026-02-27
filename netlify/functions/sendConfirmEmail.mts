import type { Handler } from '@netlify/functions'

/**
 * Public Netlify function called by the client after supabase.auth.signUp().
 * Generates a Supabase confirmation link via the admin API (using the service
 * role key server-side) and delivers it via Mailgun so the user gets a branded
 * email — bypassing Supabase's rate-limited built-in email service.
 *
 * POST body: { email: string, name?: string }
 * No auth header required (safe because this can only generate links for
 * existing pending signups and uses server-only env vars).
 */
const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const { email, name } = JSON.parse(event.body || '{}')
    if (!email) return { statusCode: 400, body: 'Missing required field: email' }

    // ── 1. Generate confirmation link via Supabase admin API ──────────────
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
      return { statusCode: 500, body: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL' }
    }

    const genRes = await fetch(
      `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/generate_link`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        // 'magiclink' works for existing unconfirmed users — clicking it confirms
        // their email and signs them in, which is equivalent to a signup confirmation.
        // 'signup' type fails with email_exists because it tries to create a new user.
        body: JSON.stringify({ type: 'magiclink', email }),
      }
    )

    if (!genRes.ok) {
      const text = await genRes.text()
      console.error('[sendConfirmEmail] generate_link failed', genRes.status, text)
      // If user is already confirmed (or similar Supabase edge case), treat as non-fatal
      // so the caller can still show the "check your email" notice.
      return { statusCode: 200, body: JSON.stringify({ ok: false, warning: `generate_link returned ${genRes.status}: ${text}` }) }
    }

    const genJson = await genRes.json()
    const actionLink: string | undefined = genJson?.action_link || genJson?.link || genJson?.url
    if (!actionLink) {
      return { statusCode: 500, body: 'Supabase did not return an action link' }
    }

    // ── 2. Send via Mailgun ───────────────────────────────────────────────
    // Support both the NETLIFY_EMAILS_* naming (already configured on Netlify)
    // and the standalone MAILGUN_* vars as a fallback.
    const mgApiKey = process.env.NETLIFY_EMAILS_PROVIDER_API_KEY || process.env.MAILGUN_API_KEY
    const mgDomain = process.env.NETLIFY_EMAILS_MAILGUN_DOMAIN || process.env.MAILGUN_DOMAIN
    // Strip surrounding quotes that some env var editors add (e.g. "Wkly <x@y>" → Wkly <x@y>)
    const fromEmail = (process.env.FROM_EMAIL || `noreply@${mgDomain}`).replace(/^["']|["']$/g, '')
    // Netlify Emails uses 'eu' region for api.eu.mailgun.net, otherwise api.mailgun.net
    const isEu = (process.env.NETLIFY_EMAILS_MAILGUN_HOST_REGION || '').toLowerCase() === 'eu'
    const mgBase = isEu ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3'

    if (!mgApiKey || !mgDomain) {
      return { statusCode: 500, body: 'Server misconfigured: missing Mailgun env vars' }
    }

    const html = `
      <html>
        <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; padding:24px;">
          <h2 style="margin-bottom:8px">Confirm your Wkly account</h2>
          <p style="margin-top:0">Hi ${name || ''},</p>
          <p>Click the button below to confirm your account and finish signing up.</p>
          <p style="margin:24px 0">
            <a href="${actionLink}" style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">
              Confirm account
            </a>
          </p>
          <p style="font-size:13px;color:#6b7280">If you didn't request this, you can safely ignore this email.</p>
        </body>
      </html>`

    const params = new URLSearchParams()
    params.append('from', fromEmail)
    params.append('to', email)
    params.append('subject', 'Confirm your Wkly account')
    params.append('html', html)

    const auth = 'Basic ' + Buffer.from(`api:${mgApiKey}`).toString('base64')

    const mgRes = await fetch(
      `${mgBase}/${mgDomain}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    )

    if (!mgRes.ok) {
      const text = await mgRes.text()
      console.error('[sendConfirmEmail] Mailgun error:', mgRes.status, text)
      return { statusCode: 200, body: JSON.stringify({ ok: false, warning: `Mailgun ${mgRes.status}: ${text}` }) }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err: any) {
    console.error('[sendConfirmEmail] unexpected error:', err)
    return { statusCode: 500, body: String(err?.message || err) }
  }
}

export { handler }
