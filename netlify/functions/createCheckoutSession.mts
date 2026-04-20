import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, withCors } from './lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Creates a Stripe Checkout Session for the authenticated user.
 * Accepts plan_type: 'monthly' | 'yearly' | 'one_time'
 * Returns { sessionId, url } for Stripe Elements or redirect.
 */
export const handler = withCors(async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const auth = await requireAuth(event);
  if (auth.error) return auth.error;
  const { userId } = auth;

  const body = JSON.parse(event.body || '{}');
  const { plan_type } = body as { plan_type?: string };

  if (!plan_type || !['monthly', 'yearly', 'one_time'].includes(plan_type)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan_type. Must be monthly, yearly, or one_time.' }) };
  }

  // Map plan_type to Stripe price ID
  const priceMap: Record<string, string | undefined> = {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    yearly: process.env.STRIPE_PRICE_YEARLY,
    one_time: process.env.STRIPE_PRICE_ONE_TIME,
  };

  const priceId = priceMap[plan_type];
  if (!priceId) {
    return { statusCode: 500, body: JSON.stringify({ error: `Stripe price not configured for ${plan_type}` }) };
  }

  // Look up or create a Stripe customer for this user
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', userId)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    // Fetch email from auth.users if not on profile
    let email = profile?.email;
    if (!email) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      email = authUser?.user?.email || undefined;
    }

    const customer = await stripe.customers.create({
      metadata: { user_id: userId },
      ...(email ? { email } : {}),
    });
    customerId = customer.id;

    // Store customer ID on profile for future lookups
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  const isSubscription = plan_type !== 'one_time';
  const origin = event.headers.origin || 'https://wkly.netlify.app';

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    payment_method_types: ['card'],
    mode: isSubscription ? 'subscription' : 'payment',
    ui_mode: 'embedded_page',
    line_items: [{ price: priceId, quantity: 1 }],
    return_url: `${origin}/pricing?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { user_id: userId },
  };

  const session = await stripe.checkout.sessions.create(sessionConfig);

  return {
    statusCode: 200,
    body: JSON.stringify({ clientSecret: session.client_secret }),
  };
});
