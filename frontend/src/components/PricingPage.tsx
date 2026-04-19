import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { Check, Sparkles, ArrowLeft, Crown, Zap } from 'lucide-react';
import { useTier } from '@hooks/useTier';
import supabase from '@lib/supabase';
import { notifySuccess, notifyError } from '@components/ToastyNotification';

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started and build the habit',
    icon: <Zap className="w-6 h-6" />,
    features: [
      'Up to 3 active goals',
      '6 tasks per goal',
      '7-day task scheduling',
      '1 AI plan generation per goal',
      '1 weekly summary',
      'Basic affirmations',
    ],
    excluded: [
      'Monthly & yearly summaries',
      'AI Focus Chat',
      'Momentum analytics',
      'Priority support',
    ],
  },
  {
    id: 'subscription' as const,
    name: 'Pro',
    price: '$9.99',
    yearlyPrice: '$79.99',
    period: '/mo',
    yearlyPeriod: '/yr',
    description: 'Unlimited access to everything',
    icon: <Sparkles className="w-6 h-6" />,
    popular: true,
    features: [
      'Unlimited goals',
      'Unlimited tasks per goal',
      'Unlimited scheduling',
      'Unlimited AI plan generations',
      'Unlimited summaries (week, month, year)',
      'AI Focus Chat',
      'Full affirmation library',
      'Momentum analytics',
      'Priority support',
    ],
    excluded: [],
  },
  {
    id: 'one_time' as const,
    name: 'Lifetime',
    price: '$79.99',
    period: 'one-time',
    description: 'Pay once, unlock for 1 year',
    icon: <Crown className="w-6 h-6" />,
    features: [
      'Everything in Pro',
      'No recurring charges',
      '1 year of feature updates',
      'Full AI access',
      'Priority support',
    ],
    excluded: [],
  },
];

const PricingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status, isPaid, isFree, refresh } = useTier();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  // After successful payment, refresh tier status
  React.useEffect(() => {
    if (success) {
      refresh();
      notifySuccess('Payment successful! Your plan is now active.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  const handleSelectPlan = async (planType: 'monthly' | 'yearly' | 'one_time') => {
    setLoadingPlan(planType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        notifyError('Please sign in to upgrade');
        return;
      }

      const res = await fetch('/.netlify/functions/createCheckoutSession', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_type: planType }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        notifyError('Failed to start checkout');
      }
    } catch {
      notifyError('Something went wrong. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Back */}
      <Button onClick={() => navigate(-1)} className="button-primary flex items-center gap-1 text-sm text-secondary-text hover:text-primary-text mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-primary-text mb-2">Choose Your Plan</h1>
        <p className="text-secondary-text">Unlock the full power of Wkly to reach your goals faster</p>
      </div>

      {/* Success / Canceled banners */}
      {success && (
        <div className="mb-8 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 p-4 text-center text-green-700 dark:text-green-300">
          <Check className="inline w-5 h-5 mr-1" /> Your plan is now active. Welcome aboard!
        </div>
      )}
      {canceled && (
        <div className="mb-8 rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 p-4 text-center text-yellow-700 dark:text-yellow-300">
          Checkout was canceled. No charge was made.
        </div>
      )}

      {/* Billing cycle toggle for subscription */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-gray-20 dark:border-gray-70 p-1 bg-gray-10 dark:bg-gray-80">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-l-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'opacity-100 text-white bg-primary hover:bg-primary cursor-none shadow-sm' : 'opacity-75 bg-secondary text-white hover:text-primary-text'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-r-full text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'opacity-100 text-white bg-primary hover:bg-primary cursor-none shadow-sm' : 'opacity-75 bg-secondary text-white hover:text-primary-text'}`}
          >
            Yearly <span className="text-xs opacity-75">&nbsp;– Save 33%</span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = status.tier === plan.id || (status.tier === 'subscription' && plan.id === 'subscription');
          const isPopular = plan.popular;
          const showYearly = plan.id === 'subscription' && billingCycle === 'yearly';

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-6 flex flex-col transition-shadow ${
                isPopular
                  ? 'border-primary shadow-lg shadow-primary/10 dark:shadow-primary/5'
                  : 'border-gray-20 dark:border-gray-70'
              } ${isCurrent ? 'ring-2 ring-primary/50' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${isPopular ? 'bg-primary/10 text-primary' : 'bg-gray-10 dark:bg-gray-80 text-secondary-text'}`}>
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-primary-text">{plan.name}</h3>
                  <p className="text-xs text-secondary-text">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-primary-text">
                  {showYearly ? plan.yearlyPrice : plan.price}
                </span>
                <span className="text-sm text-secondary-text ml-1">
                  {showYearly ? plan.yearlyPeriod : plan.period}
                </span>
                {showYearly && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ~$6.67/mo — save $40/yr
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-primary-text">
                    <Check className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {plan.excluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-40 dark:text-gray-50 line-through">
                    <span className="w-4 h-4 mt-0.5 shrink-0 text-center">—</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <Button variant="outlined" disabled className="!normal-case w-full">
                  Current Plan
                </Button>
              ) : plan.id === 'free' ? (
                <Button variant="outlined" disabled={isFree} className="!normal-case w-full" onClick={() => navigate('/')}>
                  {isFree ? 'Current Plan' : 'Downgrade'}
                </Button>
              ) : plan.id === 'subscription' ? (
                <Button
                  variant="contained"
                  className="!normal-case btn-primary w-full"
                  disabled={!!loadingPlan}
                  onClick={() => handleSelectPlan(billingCycle === 'yearly' ? 'yearly' : 'monthly')}
                >
                  {loadingPlan === 'monthly' || loadingPlan === 'yearly' ? 'Redirecting...' : `Get ${plan.name}`}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  className="!normal-case btn-primary w-full"
                  disabled={!!loadingPlan}
                  onClick={() => handleSelectPlan('one_time')}
                >
                  {loadingPlan === 'one_time' ? 'Redirecting...' : `Get ${plan.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ or help text */}
      <div className="text-center mt-10 text-sm text-secondary-text">
        <p>All plans include core features like goal tracking, task management, and weekly reviews.</p>
        <p className="mt-1">Questions? Reach out at <span className="text-primary">support@wkly.app</span></p>
      </div>
    </div>
  );
};

export default PricingPage;
