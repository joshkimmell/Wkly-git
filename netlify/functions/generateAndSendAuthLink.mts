import type { Handler } from '@netlify/functions'

/**
 * Netlify function to generate Supabase confirmation/reset links using the
 * SUPABASE_SERVICE_ROLE_KEY and then call the internal mailer function
 * (`/.netlify/functions/sendEmail`) to deliver the branded email.
 *
 * Expected POST body: { type: 'reset'|'confirm', email: string, name?: string }
 * Requires env: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, MAILER_API_KEY (shared secret), MAILER_URL (optional)
 */

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

    const incomingKey = event.headers['x-api-key'] || event.headers['X-API-KEY']
    if (!process.env.MAILER_API_KEY || incomingKey !== process.env.MAILER_API_KEY) {
      return { statusCode: 401, body: 'Unauthorized' }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
      return { statusCode: 500, body: 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL' }
    }

    const payload = JSON.parse(event.body || '{}')
    const { type, email, name } = payload
    if (!type || !email) return { statusCode: 400, body: 'Missing required fields: type and email' }

    // Map to Supabase admin generate_link types
    const supaType = type === 'reset' ? 'reset_password' : 'signup'

    const genUrl = `${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/generate_link`

    const genRes = await fetch(genUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ type: supaType, email })
    })

    if (!genRes.ok) {
      const text = await genRes.text()
      return { statusCode: 502, body: `Supabase generate_link error: ${text}` }
    }

    const genJson = await genRes.json()
    const actionLink = genJson?.action_link || genJson?.action_link || genJson?.link || genJson?.url
    if (!actionLink) return { statusCode: 500, body: 'Supabase did not return an action link' }

    // Call the mailer function (defaults to internal endpoint)
    const mailerUrl = process.env.MAILER_URL || '/.netlify/functions/sendEmail'
    const mailerRes = await fetch(mailerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.MAILER_API_KEY
      },
      body: JSON.stringify({ type: type === 'reset' ? 'reset' : 'confirm', email, name, url: actionLink })
    })

    if (!mailerRes.ok) {
      const text = await mailerRes.text()
      return { statusCode: 502, body: `Mailer error: ${text}` }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, link: actionLink }) }
  } catch (err: any) {
    return { statusCode: 500, body: String(err?.message || err) }
  }
}

export { handler }
