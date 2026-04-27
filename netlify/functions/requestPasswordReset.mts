import type { Handler } from '@netlify/functions'

/**
 * Public endpoint — no auth required.
 * Generates a Supabase password-reset link via the Admin API and delivers it
 * through Mailgun (bypassing Supabase's built-in email rate limit).
 *
 * Always responds 200 to prevent email enumeration.
 *
 * POST body: { email: string }
 * Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MAILER_API_KEY, URL (optional)
 */
const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Always return 200 — never reveal whether an email address exists
  const ok = () => ({ statusCode: 200, body: JSON.stringify({ ok: true }) })

  try {
    const { email } = JSON.parse(event.body || '{}')
    if (!email || typeof email !== 'string') return ok()

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const mailerApiKey = process.env.MAILER_API_KEY
    const appUrl = (process.env.URL || 'https://wkly.me').replace(/\/$/, '')

    if (!supabaseUrl || !supabaseServiceKey || !mailerApiKey) {
      console.error('[requestPasswordReset] Missing required env vars')
      return ok()
    }

    // Generate a reset link via Supabase Admin API.
    // This does NOT send an email — it only produces the action link.
    const redirectTo = `${appUrl}/profile?changePassword=true`
    const genRes = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/generate_link`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
        body: JSON.stringify({
          type: 'reset_password',
          email,
          options: { redirect_to: redirectTo },
        }),
      }
    )

    if (!genRes.ok) {
      console.error('[requestPasswordReset] generate_link error:', await genRes.text())
      return ok()
    }

    const genJson = await genRes.json()
    const actionLink: string | undefined =
      genJson?.action_link || genJson?.link || genJson?.url
    if (!actionLink) {
      console.error('[requestPasswordReset] No action link returned by Supabase')
      return ok()
    }

    // Deliver via Mailgun through the branded mailer function
    const mailerRes = await fetch(`${appUrl}/.netlify/functions/sendEmail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': mailerApiKey,
      },
      body: JSON.stringify({ type: 'reset', email, url: actionLink }),
    })

    if (!mailerRes.ok) {
      console.error('[requestPasswordReset] Mailer error:', await mailerRes.text())
    }

    return ok()
  } catch (err: any) {
    console.error('[requestPasswordReset] Unexpected error:', err)
    return ok()
  }
}

export { handler }
