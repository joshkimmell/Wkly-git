import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, withCors } from './lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Creates a Stripe Billing Portal session for the authenticated user
 * so they can manage/cancel their subscription.
 */
export const handler = withCors(async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No active subscription found.' }) };
  }

  const returnUrl = `${event.headers.origin || 'https://wkly.netlify.app'}/profile`;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: returnUrl,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: portalSession.url }),
  };
});
