## Plan: Payment Tiers Implementation

### TL;DR
Add 3-tier access system (Free / Subscription $9.99mo or $79.99yr / One-Time $79.99) using **Stripe Elements** (embedded payment), enforced on **both server and client**, with a `/pricing` route in the app. Existing users grandfathered to Subscription tier.

---

### Phase 1: Database Schema *(blocks all other phases)*

1. **Add subscription columns to `profiles`** — new migration adds `subscription_tier` ('free'/'subscription'/'one_time'), `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `tier_expires_at`, `tier_started_at`
2. **Create `usage_tracking` table** — tracks per-user feature usage (plan generations, summaries, goals, tasks) per period
3. **Grandfather existing users** — migration sets all current users to `subscription_tier = 'subscription'`

### Phase 2: Stripe Integration *(parallel with Phase 3)*

4. **Install Stripe** — `stripe` in functions, `@stripe/stripe-js` + `@stripe/react-stripe-js` in frontend
5. **Create `stripeWebhook.mts`** — handles `checkout.session.completed`, `subscription.updated/deleted`, `invoice.payment_failed`. Uses Stripe signature verification (no JWT auth). Updates profiles tier
6. **Create `createCheckoutSession.mts`** — authed endpoint, creates Stripe session for monthly/yearly/one-time
7. **Create `createPortalSession.mts`** — authed endpoint for Stripe Billing Portal (manage/cancel subscription)
8. **Create `getTierStatus.mts`** — returns user's tier, limits, and current usage counts

### Phase 3: Server-Side Enforcement *(parallel with Phase 2)*

9. **Add tier helpers to `auth.ts`** — `requireTier()`, `getUserTier()`, `checkUsageLimit()`, `incrementUsage()`
10. **Create `tierLimits.ts`** — constant defining limits per tier:
    - **Free**: 3 active goals, 6 tasks/goal, 7-day scheduling, 1 plan gen/goal, 1 summary/week (week scope only), basic affirmations, no momentum analytics
    - **Subscription/One-Time**: Unlimited everything, full affirmations, momentum analytics, full reflection
11. **Gate functions** — add tier checks after auth in: `createGoal`, `createTask`, `generatePlan`, `generateSummary`, `createSummary`, `getAffirmations`, `saveAffirmation`, `focusChat`

### Phase 4: Frontend Tier Context & Gating

12. **Create `TierContext.tsx`** + **`useTier.ts` hook** — fetch tier from `getTierStatus`, expose `isFree`, `isPaid`, `canCreateGoal`, `remainingGoals`, etc.
13. **Gate UI components** — `GoalForm.tsx` (goal limit), AllGoals.tsx (upgrade banner), summary/affirmation components, focus sessions
14. **Create `UpgradePrompt.tsx`** — reusable component shown when user hits a limit, links to `/pricing`
15. **Add Subscription tab to `ProfileManagement.tsx`** — shows tier, usage, renewal date, manage subscription button

### Phase 5: Pricing Page with Stripe Elements

16. **Create `PricingPage.tsx`** at `/pricing` route — 3-column tier comparison, embedded Stripe Payment Element
17. **Stripe Elements flow** — select plan → create checkout session → render payment form → confirm → webhook updates tier → TierContext refreshes
18. **Update netlify.toml** — ensure webhook endpoint isn't caught by SPA redirect

---

### Relevant Files

**New** (12 files): 3 migrations, `tierLimits.ts`, 4 Netlify functions (webhook, checkout, portal, tierStatus), `TierContext.tsx`, `useTier.ts`, `PricingPage.tsx`, `UpgradePrompt.tsx`

**Modified** (16 files): auth.ts, createGoal.mts, createTask.mts, generatePlan.mts, generateSummary.mts, createSummary.mts, getAffirmations.mts, focusChat.mts, both package.json files, App.tsx, useAuth.ts, GoalForm.tsx, AllGoals.tsx, ProfileManagement.tsx, netlify.toml

### Verification
1. Run migrations → confirm schema changes + grandfather data
2. `stripe listen --forward-to` → test webhook locally
3. Free tier: verify 3-goal, 6-task, 7-day, 1-plan, 1-summary limits enforced
4. Paid tier: verify unrestricted access
5. Upgrade flow: limit prompt → pricing → Stripe payment → tier updates → features unlock
6. Cancel: Stripe portal → webhook → revert to free → limits enforced
7. `npm run build:ios` still succeeds

### Decisions
- Stripe Elements (embedded), not Checkout (hosted redirect)
- Enforcement on both server (authoritative) and client (UX)
- Existing users → Subscription tier (grandfathered)
- Free: 3 goals, 6 tasks/goal, 7-day scheduling, 1 plan gen/goal, 1 summary/week
- Subscription and One-Time have identical features; differ in billing model and updates window

### Further Considerations
1. **One-time expiry behavior**: When the 1-year update window ends, should users keep current features frozen, or revert to free? Recommend: keep features frozen, just stop receiving new feature access.
2. **Free trial**: Consider 7-14 day trial of Subscription for new signups to demonstrate value.
3. **Apple/Google IAP**: App Store requires in-app purchases for digital goods sold within the app. Stripe works for web, but Capacitor builds may need RevenueCat or native IAP integration as a follow-up phase.