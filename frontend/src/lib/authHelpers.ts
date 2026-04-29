/**
 * Request a password reset email delivered via Mailgun (not Supabase's mailer),
 * bypassing Supabase's built-in email rate limit.
 */
export async function sendPasswordReset(email: string) {
  if (!email) throw new Error('Email is required')
  const res = await fetch('/.netlify/functions/requestPasswordReset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { error: new Error(text || 'Failed to send reset email') }
  }
  return { error: null }
}
