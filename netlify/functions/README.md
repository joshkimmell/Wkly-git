Serverless email sender for Wkly

This Netlify Function sends confirmation and password-reset emails via Mailgun.

Environment variables (set these in Netlify dashboard):

- `MAILGUN_API_KEY` — Mailgun API key (starts with `key-...`)
- `MAILGUN_DOMAIN` — Your Mailgun sending domain (e.g. `mg.wkly.me` or `wkly.me`)
- `FROM_EMAIL` — Verified sending address, e.g. `no-reply@wkly.me`

If you plan to generate Supabase links server-side, add these additional env vars:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role key (keep secret)
- `SUPABASE_URL` — Your Supabase project URL (e.g. `https://your-project-ref.supabase.co`)
- `MAILER_API_KEY` — Internal shared secret used to authenticate calls between functions (set to a random string)
- `MAILER_URL` — Optional; URL to mailer function if deployed externally (defaults to `/.netlify/functions/sendEmail`)

Function endpoint (after deploy):

POST /.netlify/functions/sendEmail

Request JSON body:

{
  "type": "confirm" | "reset",
  "email": "user@example.com",
  "name": "Optional User Name",
  "url": "https://app.wkly.me/confirm?token=..."
}

Notes:
- This function only sends emails; it does not generate Supabase confirmation or reset tokens.
- Recommended flows:
  - Use Supabase Admin API (server-side) or Auth webhooks to obtain/generate confirmation/reset links, then call this function to send a branded email.
  - Or, after using Supabase client-side signUp, use Supabase's confirm flow tokens if you can capture them server-side and send via this function.

Example client call (fetch):

```js
await fetch('/.netlify/functions/sendEmail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'confirm',
    email: 'test@example.com',
    name: 'Chris',
    url: 'https://app.wkly.me/confirm?token=...'
  })
})
```

Security:
- Do not call this function directly from untrusted clients with arbitrary HTML or links. Prefer server-side callers or protect the endpoint with a token.
- For high security, use Supabase webhooks (user.created) or a server-side job that validates events and calls this function.

Local development and Netlify setup
- Copy `.env.example` to `.env` for local testing (do not commit `.env`).
- Start the functions locally with `netlify dev` and the Netlify CLI will load your `.env` file.
- To set environment variables in Netlify dashboard: Site Settings → Build & deploy → Environment → Environment variables. Add `SENDGRID_API_KEY` and `FROM_EMAIL` there.

- To set environment variables in Netlify dashboard: Site Settings → Build & deploy → Environment → Environment variables. Add `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` and `FROM_EMAIL` there.

Example `.env` (local only):

```
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.wkly.me
FROM_EMAIL=no-reply@wkly.me
# Optional for server-side link generation
SUPABASE_SERVICE_ROLE_KEY=service_role_xxxxx
SUPABASE_URL=https://your-project-ref.supabase.co
```

When to generate confirmation/reset links
- Easiest approach: have a server-side job (or a separate Netlify function) generate the Supabase confirmation/reset URL using your `SUPABASE_SERVICE_ROLE_KEY`, then call this mailer to send a branded email. This keeps tokens secret and avoids exposing admin keys to clients.
- If you prefer immediate control but no server: generate the link in your backend and call `/.netlify/functions/sendEmail` with the `url` field set to that link.

New helper function:
- `/.netlify/functions/generateAndSendAuthLink` — generates a Supabase link (requires `SUPABASE_SERVICE_ROLE_KEY`) and calls the mailer. It expects a POST body `{ type: 'reset'|'confirm', email, name? }` and requires header `X-API-KEY: <MAILER_API_KEY>`.

Mailgun domain setup notes:
- In the Mailgun dashboard go to `Sending` → `Domains` → `Add New Domain` and use a subdomain such as `mg.wkly.me` (recommended).
- Mailgun will present DNS records (SPF/TXT and DKIM CNAME/TXT) to add to your DNS provider. Add those and wait for verification.
- After domain verification, Mailgun will allow you to send from addresses like `no-reply@wkly.me` (or `no-reply@mg.wkly.me` depending on your setup).

