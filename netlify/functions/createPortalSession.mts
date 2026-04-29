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
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    // Attempt to find the Stripe customer by user metadata (auto-heal missing customer ID)
    const customers = await stripe.customers.search({
      query: `metadata['user_id']:'${userId}'`,
      limit: 1,
    });
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      // Persist it so future calls succeed immediately
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'No billing account found. Please contact support.' }) };
    }
  }

  const returnUrl = `${event.headers.origin || 'https://wkly.netlify.app'}/profile`;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: portalSession.url }),
  };
});
