import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { CORS_HEADERS } from './lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Stripe webhook handler — receives events from Stripe and updates user tiers.
 * Uses Stripe signature verification instead of JWT auth.
 * Must NOT use requireAuth or withCors (signature verification replaces auth).
 */
export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const sig = event.headers['stripe-signature'];
  if (!sig) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing Stripe signature' }) };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[stripeWebhook] Signature verification failed:', err.message);
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error('[stripeWebhook] checkout.session.completed missing user_id metadata');
          break;
        }

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;
        const mode = session.mode; // 'subscription' or 'payment'

        if (mode === 'subscription') {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'subscription',
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active',
              tier_started_at: new Date().toISOString(),
              tier_expires_at: null,
            })
            .eq('id', userId);
        } else if (mode === 'payment') {
          // One-time payment — 1 year of access
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);

          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'one_time',
              stripe_customer_id: customerId,
              stripe_subscription_id: null,
              subscription_status: 'active',
              tier_started_at: new Date().toISOString(),
              tier_expires_at: expiresAt.toISOString(),
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'canceled',
          trialing: 'trialing',
          unpaid: 'past_due',
          incomplete: 'past_due',
          incomplete_expired: 'expired',
          paused: 'canceled',
        };

        const mappedStatus = statusMap[subscription.status] || 'active';

        await supabase
          .from('profiles')
          .update({ subscription_status: mappedStatus })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        console.log(`[stripeWebhook] Unhandled event type: ${stripeEvent.type}`);
    }
  } catch (err) {
    console.error('[stripeWebhook] Error processing event:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Webhook processing error' }) };
  }

  return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ received: true }) };
};
