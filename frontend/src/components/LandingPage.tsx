import React, { useState, useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';
import Modal from 'react-modal';
import { TextField, Button, IconButton, Paper, Checkbox, FormControlLabel } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import AppMuiThemeProvider from '../mui/muiTheme';
import appColors from '@styles/appColors';
import { ARIA_HIDE_APP } from '@lib/modal';
import { modalClasses, overlayClasses } from '@styles/classes';
import {
  ArrowRight, Award, Brain, CheckSquare, Crown, Eye, EyeOff,
  Laugh, Moon, Sparkles, Sun, Target, Timer, UnlockKeyhole, Zap,
} from 'lucide-react';
import ToastNotification, { notifySuccess, notifyError } from '@components/ToastyNotification';
import { sendPasswordReset } from '@lib/authHelpers';
import RequestAccess from '@components/RequestAccess';
import Logo from '@components/Logo';

const LandingPage = () => {
  // ── Auth state ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordReEnter, setPasswordReEnter] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [registerErrors, setRegisterErrors] = useState<{ email?: string; password?: string; passwordReEnter?: string }>({});
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showConfirmNotice, setShowConfirmNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordReEnter, setShowPasswordReEnter] = useState(false);
  const [isRequestAccessModalOpen, setIsRequestAccessModalOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'theme-dark' || stored === 'theme-light') return stored;
    } catch {}
    return 'theme-dark';
  });

  const muiTheme = useMuiTheme();
  const fieldBg = muiTheme?.palette?.background?.paper || 'var(--wkly-background)';
  const dividerColor = muiTheme?.palette?.divider || 'var(--wkly-divider)';
  const radius = (muiTheme as any)?.shape?.borderRadius
    ? `${(muiTheme as any).shape.borderRadius}px`
    : '8px';

  const toggleTheme = () =>
    setTheme(prev => {
      const next = prev === 'theme-dark' ? 'theme-light' : 'theme-dark';
      document.documentElement.classList.toggle('dark', next === 'theme-dark');
      try { localStorage.setItem('theme', next); } catch {}
      return next;
    });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'theme-dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      const stored = appColors.getStoredPalette();
      appColors.applyPaletteToRoot(stored || 'purple');
    } catch {}
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Auth helpers (mirrored from Auth.tsx) ─────────────────────────────────
  const isValidEmail = (value: string) =>
    /^(?:[a-zA-Z0-9_'^&+/=`{|}~.-])+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(value);

  const signInUser = async (em: string, pw: string) => {
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: em, password: pw });
      if (err) { setError(err.message); return null; }
      setError(null);
      return data;
    } catch { setError('Unexpected error occurred.'); return null; }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof loginErrors = {};
    if (!email) errs.email = 'Email is required';
    else if (!isValidEmail(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    setLoginErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const result = await signInUser(email, password);
    if (!result) setError('Failed to log in. Please check your credentials.');
  };

  const passwordsMatch = password && passwordReEnter && password === passwordReEnter;

  const createUser = async (
    em: string, pw: string, pwRe: string, uname: string, name: string
  ) => {
    if (pw !== pwRe) {
      setError('Passwords do not match.');
      setRegisterErrors(p => ({ ...p, passwordReEnter: 'Passwords do not match' }));
      return null;
    }
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: em, password: pw,
        options: { emailRedirectTo: 'https://wkly.me' },
      });
      if (err) { setError(err.message); return null; }
      const { user } = data;
      if (user?.id) {
        const { data: sd } = await supabase.auth.getSession();
        const sess = (sd as any)?.session;
        if (sess) {
          const { data: existing, error: fetchErr } = await supabase
            .from('profiles').select('id', { head: false, count: 'exact' })
            .eq('id', user.id).single();
          if (!fetchErr && !existing) {
            await supabase.from('profiles').insert({
              id: user.id,
              username: uname || null,
              full_name: name || null,
              disclaimer_accepted: disclaimerAccepted,
              disclaimer_accepted_at: disclaimerAccepted ? new Date().toISOString() : null,
            });
          }
        }
      }
      setError(null);
      return data;
    } catch { setError('Unexpected error occurred.'); return null; }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof registerErrors = {};
    if (!email) errs.email = 'Email is required';
    if (!password) errs.password = 'Password is required';
    if (!passwordReEnter) errs.passwordReEnter = 'Please re-enter password';
    if (password && passwordReEnter && password !== passwordReEnter)
      errs.passwordReEnter = 'Passwords do not match';
    if (!disclaimerAccepted) {
      notifyError('You must acknowledge the proof-of-concept disclaimer to continue');
      return;
    }
    setRegisterErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const res = await fetch(`/api/checkApproval?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const { approved } = await res.json();
      if (!approved) {
        setIsRegisterModalOpen(false);
        notifyError('This email is not approved for registration. Please request access first.');
        setTimeout(() => setIsRequestAccessModalOpen(true), 500);
        return;
      }
      const { data: ep } = await supabase
        .from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (ep) {
        setIsRegisterModalOpen(false);
        notifyError('You already have an account! Please log in instead.');
        setTimeout(() => setIsLoginModalOpen(true), 500);
        return;
      }
    } catch { notifyError('Failed to verify registration approval. Please try again.'); return; }

    const result = await createUser(email, password, passwordReEnter, username, fullName);
    if (!result) { notifyError('Registration failed. Please check your input and try again.'); return; }
    setIsRegisterModalOpen(false);
    setShowConfirmNotice(true);
  };

  const handlePasswordReset = async (em: string) => {
    try {
      const { error: err } = await sendPasswordReset(em);
      if (err) { notifyError(err.message); setError(err.message); return; }
      notifySuccess('Password reset email sent. Check your inbox.');
      setError(null);
    } catch (err: any) { setError(err?.message || 'Unexpected error occurred.'); }
  };

  const fieldSx = {
    mb: 1,
    '& .MuiOutlinedInput-root': { backgroundColor: fieldBg, borderRadius: radius },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: dividerColor },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AppMuiThemeProvider mode={theme}>
        <div className={theme}>
          <div className="min-h-screen bg-background text-primary-text">

            {/* ── Sticky Nav ── */}
            <header
              className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
                scrolled
                  ? 'bg-background/90 backdrop-blur-md shadow-sm border-b border-brand-30 dark:border-brand-70'
                  : ''
              }`}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 h-16 flex items-center justify-between">
                <Logo
                  aria-label="Wkly logo"
                  style={{ color: 'var(--brand-30)' }}
                  className="h-10 w-auto"
                />
                <div className="flex items-center gap-2">
                  {/* <button
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    className="btn-ghost p-2 rounded-lg"
                  >
                    {theme === 'theme-dark'
                      ? <Sun className="w-5 h-5" />
                      : <Moon className="w-5 h-5" />}
                  </button> */}
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="btn-ghost hover:bg-brand-30 hover:text-inverse-text px-4 py-2 text-sm font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setIsRequestAccessModalOpen(true)}
                    className="btn-primary px-5 py-2 text-sm font-medium"
                  >
                    Request Access
                  </button>
                </div>
              </div>
            </header>

            {/* ── Hero ── */}
            <section className="relative flex flex-col justify-center min-h-screen overflow-hidden">
              {/* Background */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand-100) 0%, var(--brand-90) 50%, var(--brand-80) 100%)',
                }}
              />
              {/* Radial glow */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(139,0,158,0.25) 0%, transparent 70%)',
                }}
              />

              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 pt-32 pb-28">
                <div className="max-w-3xl">
                  {/* Eyebrow badge */}
                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-8"
                    style={{
                      border: '1px solid rgba(232,96,248,0.35)',
                      background: 'rgba(47,0,53,0.6)',
                      color: 'var(--brand-20)',
                    }}
                  >
                    {/* <Sparkles className="w-3.5 h-3.5" /> */}
                    Beta Launch - Request Access Now
                  </div>

                  {/* Headline */}
                  <h1
                    className="font-serif leading-[1.05] mb-6"
                    style={{
                      fontSize: 'clamp(2.8rem, 7vw, 5rem)',
                      color: '#ffffff',
                    }}
                  >
                    Turn your week<br />
                    into{' '}
                    <span style={{ color: 'var(--brand-30)' }}>wins.</span>
                  </h1>

                  {/* Subheadline */}
                  <p
                    className="text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed"
                    style={{ color: 'rgba(252, 232, 255, 0.75)' }}
                  >
                    Wkly is your focused command center for weekly goals, daily tasks, and
                    AI-powered progress summaries — designed around the rhythm that actually
                    drives results.
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-wrap gap-3 mb-14">
                    <button
                      onClick={() => setIsRequestAccessModalOpen(true)}
                      className="btn-primary px-8 py-4 text-base font-medium flex items-center gap-2"
                    >
                      Request Access
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsLoginModalOpen(true)}
                      className="px-8 py-4 text-base font-medium rounded bg-transparent hover:bg-brand-30 hover:text-inverse-text transition-colors"
                      style={{
                        border: '1px solid rgba(232,96,248,0.35)',
                        color: 'var(--brand-10)',
                      }}
                    >
                      Sign In
                    </button>
                  </div>

                  {/* Feature chips */}
                  <div className="flex flex-wrap gap-2">
                    {['Weekly Goals', 'Daily Tasks', 'Wins Log', 'AI Summaries', 'Affirmations', 'Focus Mode', 'Pomodoro Timer'].map(chip => (
                      <span
                        key={chip}
                        className="px-3 py-1 text-sm rounded-full"
                        style={{
                          border: '1px solid rgba(104,0,118,0.5)',
                          color: 'var(--gray-30)',
                          background: 'rgba(29,0,32,0.5)',
                        }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                    <div className="mt-16 text-xs text-secondary-text">
                        App store and Google Play apps coming soon — sign up to be the first to know when we launch!
                    </div>
                </div>
              </div>

              {/* Fade into next section */}
              <div
                className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
                style={{ background: 'linear-gradient(to top, var(--brand-100)/0.8, transparent)' }}
              />
            </section>

            {/* ── Features ── */}
            <section className="py-24 bg-background">
              <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
                <div className="text-center mb-16">
                  <h2 className="font-serif font-normal text-3xl sm:text-4xl mb-4">
                    Everything you need to stay on track
                  </h2>
                  <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--secondary-text)' }}>
                    Built around the weekly rhythm — because that's how meaningful progress
                    actually happens.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    {
                      icon: <Target className="w-6 h-6" />,
                      label: 'Weekly Goals',
                      desc: 'Set 3–5 focused goals each week. Prioritize what matters instead of being pulled in every direction.',
                    },
                    {
                      icon: <CheckSquare className="w-6 h-6" />,
                      label: 'Task Tracking',
                      desc: 'Break goals into tasks, schedule them across your week, and check them off as you go.',
                    },
                    {
                      icon: <Award className="w-6 h-6" />,
                      label: 'Capture Wins',
                      desc: 'Log what you actually accomplished. Progress is visible, not buried under what\'s still pending.',
                    },
                    {
                      icon: <Sparkles className="w-6 h-6" />,
                      label: 'AI Summaries',
                      desc: 'Auto-generated weekly summaries you can share with your team or use for personal reflection.',
                    },
                    {
                      icon: <Laugh className="w-6 h-6" />,
                      label: 'Daily Affirmations',
                      desc: 'Start each day with a humorous, AI-curated affirmation — because motivation doesn\'t have to take itself so seriously.',
                    },
                    {
                      icon: <Brain className="w-6 h-6" />,
                      label: 'AI Focus Mode',
                      desc: 'Chat with an AI coach that knows your goals. Get unstuck, stay sharp, and work with real clarity.',
                    },
                    {
                      icon: <Timer className="w-6 h-6" />,
                      label: 'Pomodoro Timer',
                      desc: 'Built-in focus timer keeps you on track — work in focused sprints and actually finish what you start.',
                    },
                  ].map(({ icon, label, desc }) => (
                    <div
                      key={label}
                      className="rounded-xl p-6 flex flex-col gap-3"
                      style={{
                        border: '1px solid var(--secondary-border)',
                        background: 'var(--card-background)',
                      }}
                    >
                      <div style={{ color: 'var(--brand-40)' }} className="dark:!text-[var(--brand-30)]">
                        {icon}
                      </div>
                      <h3 className="font-serif text-lg font-semibold">{label}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--secondary-text)' }}>
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── How It Works ── */}
            <section
              className="py-24 bg-background-color"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
                <div className="text-center mb-16">
                  <h2 className="font-serif text-3xl sm:text-4xl mb-4">
                    Your weekly rhythm, simplified
                  </h2>
                  <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--secondary-text)' }}>
                    A repeatable process that keeps you accountable to what matters most.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
                  {[
                    {
                      step: '01',
                      title: 'Set your priorities',
                      desc: 'Start each week by choosing 3–5 goals. Keep them specific, scoped, and achievable within a week.',
                    },
                    {
                      step: '02',
                      title: 'Work your tasks',
                      desc: 'Break goals into tasks. Schedule them across your week and check them off as you go.',
                    },
                    {
                      step: '03',
                      title: 'Review & reflect',
                      desc: "At week's end, get an AI-powered summary of everything you accomplished — ready to share.",
                    },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex flex-col gap-4">
                      <div
                        className="font-serif text-brand-30 text-6xl font-bold leading-none"
                        // style={{ color: 'var(--brand-30)', opacity: 0.9 }}
                      >
                        {step}
                      </div>
                      <h3 className="font-serif text-xl font-semibold">{title}</h3>
                      <p className="leading-relaxed" style={{ color: 'var(--secondary-text)' }}>
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Pricing ── */}
            <section className="hidden py-24 bg-background">
              <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
                <div className="text-center mb-12">
                  <h2 className="font-serif font-normal text-3xl sm:text-4xl mb-4">Simple, transparent pricing</h2>
                  <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--secondary-text)' }}>
                    Start free. Upgrade when you're ready.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {/* Free */}
                  <div className="rounded-xl border p-6 flex flex-col" style={{ borderColor: 'var(--secondary-border)', background: 'var(--card-background)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg" style={{ background: 'var(--brand-90)', color: 'var(--brand-40)' }}>
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Free</h3>
                        <p className="text-xs" style={{ color: 'var(--secondary-text)' }}>Get started and build the habit</p>
                      </div>
                    </div>
                    <div className="mb-6">
                      <span className="text-3xl font-bold">$0</span>
                      <span className="text-sm ml-1" style={{ color: 'var(--secondary-text)' }}>forever</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {['Up to 3 active goals', '6 tasks per goal', '7-day scheduling', '1 AI plan per goal', '1 weekly summary'].map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <span style={{ color: 'var(--brand-40)' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setIsRequestAccessModalOpen(true)} className="btn-ghost w-full py-2 text-sm font-medium border rounded" style={{ borderColor: 'var(--secondary-border)' }}>
                      Get Started Free
                    </button>
                  </div>

                  {/* Pro */}
                  <div className="rounded-xl border p-6 flex flex-col relative" style={{ borderColor: 'var(--brand-40)', boxShadow: '0 0 0 1px var(--brand-40)', background: 'var(--card-background)' }}>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--brand-40)', color: '#fff' }}>Most Popular</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(139,0,158,0.15)', color: 'var(--brand-30)' }}>
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Pro</h3>
                        <p className="text-xs" style={{ color: 'var(--secondary-text)' }}>Unlimited access to everything</p>
                      </div>
                    </div>
                    <div className="mb-6">
                      <span className="text-3xl font-bold">$9.99</span>
                      <span className="text-sm ml-1" style={{ color: 'var(--secondary-text)' }}>/mo</span>
                      <p className="text-xs mt-1" style={{ color: 'var(--brand-30)' }}>or $79.99/yr — save 33%</p>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {['Unlimited goals & tasks', 'Unlimited scheduling', 'Unlimited AI summaries', 'AI Focus Chat', 'Full affirmation library', 'Momentum analytics'].map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <span style={{ color: 'var(--brand-30)' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setIsRequestAccessModalOpen(true)} className="btn-primary w-full py-2 text-sm font-medium rounded">
                      Get Pro
                    </button>
                  </div>

                  {/* One-Time */}
                  <div className="rounded-xl border p-6 flex flex-col" style={{ borderColor: 'var(--secondary-border)', background: 'var(--card-background)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg" style={{ background: 'var(--brand-90)', color: 'var(--brand-40)' }}>
                        <UnlockKeyhole className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">One-Time</h3>
                        <p className="text-xs" style={{ color: 'var(--secondary-text)' }}>Pay once, unlock for 1 year</p>
                      </div>
                    </div>
                    <div className="mb-6">
                      <span className="text-3xl font-bold">$79.99</span>
                      <span className="text-sm ml-1" style={{ color: 'var(--secondary-text)' }}>one-time</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {['Everything in Pro', 'No recurring charges', '1 year of feature updates', 'Full AI access', 'Priority support'].map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <span style={{ color: 'var(--brand-40)' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setIsRequestAccessModalOpen(true)} className="btn-ghost w-full py-2 text-sm font-medium border rounded" style={{ borderColor: 'var(--secondary-border)' }}>
                      Get One-Time Access
                    </button>
                  </div>
                </div>

                <p className="text-center mt-8 text-sm" style={{ color: 'var(--secondary-text)' }}>
                  Already have an account?{' '}
                  <button onClick={() => setIsLoginModalOpen(true)} className="underline hover:opacity-80" style={{ color: 'var(--brand-30)' }}>Sign in to upgrade</button>
                </p>
              </div>
            </section>

            {/* ── CTA Banner ── */}
            <section
              className="py-28 relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-90) 0%, var(--brand-80) 100%)',
              }}
            >
              {/* Glow */}
              <div
                className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,0,158,0.3) 0%, transparent 80%)', filter: 'blur(80px)' }}
              />
              <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-8 text-center">
                <h2
                  className="font-serif mb-6"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#fff' }}
                >
                  Ready to get focused?
                </h2>
                <p className="text-lg mb-10" style={{ color: 'rgba(252,232,255,0.7)' }}>
                  Wkly is in early access. Request your spot and start building better weekly habits.
                </p>
                <button
                  onClick={() => setIsRequestAccessModalOpen(true)}
                  className="btn-primary px-10 py-4 text-lg font-medium inline-flex items-center gap-2"
                >
                  Request Access
                  <ArrowRight className="w-5 h-5" />
                </button>
                <p className="mt-5 text-sm" style={{ color: 'rgba(252,232,255,0.5)' }}>
                  Already approved?{' '}
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="underline transition-opacity hover:opacity-100"
                    style={{ color: 'var(--brand-20)' }}
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </section>

            {/* ── Footer ── */}
            <footer
              className="py-10"
              style={{
                background: 'var(--brand-100, #0F0012)',
                borderTop: '1px solid rgba(104,0,118,0.3)',
              }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Logo
                  aria-label="Wkly"
                  style={{ color: 'var(--brand-50)', height: '2rem', width: 'auto', opacity: 0.7 }}
                  className="h-8 w-auto"
                />
                <p className="text-sm" style={{ color: 'var(--brand-60)' }}>
                  © {new Date().getFullYear()} Wkly.me 
                </p>
                {/* <a
                  href="/pricing"
                  className="text-sm transition-colors hover:opacity-100"
                  style={{ color: 'var(--brand-50)' }}
                >
                  Pricing
                </a> */}
              </div>
            </footer>

          </div>
        </div>

        {/* ── Login Modal ── */}
        <Modal
          isOpen={isLoginModalOpen}
          onRequestClose={() => { setIsLoginModalOpen(false); setError(null); setLoginErrors({}); }}
          shouldCloseOnOverlayClick
          className={`${modalClasses} w-full max-w-sm mx-4`}
          overlayClassName={`${overlayClasses} flex items-center justify-center`}
          ariaHideApp={ARIA_HIDE_APP}
        >
          <h2 className="text-2xl font-bold mb-4">Sign In</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <TextField
              id="lp-login-email"
              label="Email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setLoginErrors(s => ({ ...s, email: undefined })); }}
              onBlur={() => {
                if (!email) setLoginErrors(s => ({ ...s, email: 'Email is required' }));
                else if (!isValidEmail(email)) setLoginErrors(s => ({ ...s, email: 'Invalid email format' }));
                else setLoginErrors(s => ({ ...s, email: undefined }));
              }}
              required
              fullWidth
              size="small"
              error={!!loginErrors.email}
              helperText={loginErrors.email}
              inputProps={{ autoComplete: 'email' }}
              sx={fieldSx}
            />
            <TextField
              id="lp-login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginErrors(s => ({ ...s, password: undefined })); }}
              required
              fullWidth
              size="small"
              error={!!loginErrors.password}
              helperText={loginErrors.password}
              inputProps={{ autoComplete: 'current-password' }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(s => !s)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </IconButton>
                ),
              }}
              sx={fieldSx}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" variant="contained" size="large" fullWidth>
              Sign In
            </Button>
            <div className="flex flex-row justify-between items-center pt-1">
              <Button
                variant="text"
                className="btn-ghost"
                onClick={() => handlePasswordReset(email)}
                sx={{ py: 0.8 }}
              >
                Forgot Password
              </Button>
              <Button
                variant="outlined"
                onClick={() => { setIsLoginModalOpen(false); setIsRegisterModalOpen(true); }}
                sx={{ py: 0.8, px: 2, borderRadius: radius }}
              >
                Register
              </Button>
            </div>
          </form>
        </Modal>

        {/* ── Register Modal ── */}
        <Modal
          isOpen={isRegisterModalOpen}
          onRequestClose={() => setIsRegisterModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={overlayClasses}
          ariaHideApp={ARIA_HIDE_APP}
        >
          <div className={modalClasses}>
            <h2 className="text-2xl text-left mb-4">Register</h2>
            <form onSubmit={handleRegister} className="flex flex-col space-y-4 p-4">
              <TextField
                id="lp-reg-email"
                label="Email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setRegisterErrors(s => ({ ...s, email: undefined })); }}
                onBlur={() => {
                  if (!email) setRegisterErrors(s => ({ ...s, email: 'Email is required' }));
                  else if (!isValidEmail(email)) setRegisterErrors(s => ({ ...s, email: 'Invalid email format' }));
                  else setRegisterErrors(s => ({ ...s, email: undefined }));
                }}
                required fullWidth size="small"
                error={!!registerErrors.email}
                helperText={registerErrors.email || ''}
                inputProps={{ autoComplete: 'email' }}
                sx={fieldSx}
              />
              <TextField
                id="lp-reg-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setRegisterErrors(s => ({ ...s, password: undefined })); }}
                required fullWidth size="small"
                error={!!registerErrors.password}
                helperText={registerErrors.password}
                inputProps={{ autoComplete: 'new-password' }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(s => !s)}
                      edge="end" size="small"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 1 }}
              />
              <TextField
                id="lp-reg-reenter"
                label="Re-enter Password"
                type={showPasswordReEnter ? 'text' : 'password'}
                value={passwordReEnter}
                onChange={e => { setPasswordReEnter(e.target.value); setRegisterErrors(s => ({ ...s, passwordReEnter: undefined })); }}
                required fullWidth size="small"
                error={!!registerErrors.passwordReEnter || (!!passwordReEnter && !passwordsMatch)}
                helperText={registerErrors.passwordReEnter || ((passwordReEnter && !passwordsMatch) ? 'Passwords do not match.' : '')}
                inputProps={{ autoComplete: 'new-password' }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      aria-label={showPasswordReEnter ? 'Hide re-entered password' : 'Show re-entered password'}
                      onClick={() => setShowPasswordReEnter(s => !s)}
                      edge="end" size="small"
                    >
                      {showPasswordReEnter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </IconButton>
                  ),
                }}
                sx={{ mb: 1 }}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Paper elevation={1} className="border border-gray-20 dark:border-gray-80 p-6 bg-gray-20 dark:bg-gray-100 mb-4">
                <TextField
                  id="lp-reg-username"
                  label="Username (Optional)"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  fullWidth size="small"
                  sx={fieldSx}
                />
                <TextField
                  id="lp-reg-fullname"
                  label="Full Name (Optional)"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  fullWidth size="small"
                  sx={{ mb: 1 }}
                />
              </Paper>

              <Paper elevation={1} className="border border-amber-500 dark:border-amber-700 p-4 bg-amber-50 dark:bg-amber-950 mb-4">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={disclaimerAccepted}
                      onChange={e => setDisclaimerAccepted(e.target.checked)}
                      required
                    />
                  }
                  label={
                    <span className="text-sm">
                      I acknowledge that Wkly is currently a <strong>proof-of-concept</strong>.
                      Neither Josh Kimmell nor anyone associated with Wkly.me can be held responsible
                      for the safety, privacy, or persistence of any data I add to this application. *
                    </span>
                  }
                />
              </Paper>

              <div className="flex flex-row justify-end gap-4 pt-6">
                <Button variant="outlined" onClick={() => setIsRegisterModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!email || !password || !passwordReEnter || !passwordsMatch || !disclaimerAccepted}
                  className="btn-primary"
                >
                  Register
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* ── Confirm Notice Modal ── */}
        <Modal
          isOpen={showConfirmNotice}
          onRequestClose={() => setShowConfirmNotice(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={overlayClasses}
          ariaHideApp={ARIA_HIDE_APP}
        >
          <div className={modalClasses}>
            <h3 className="text-lg font-medium">Thanks for registering!</h3>
            <p className="mt-2" style={{ color: 'var(--secondary-text)' }}>
              Confirm your email address to continue.
            </p>
            <div className="mt-4 flex justify-end">
              <Button variant="contained" onClick={() => setShowConfirmNotice(false)} sx={{ py: 1, px: 3 }}>
                Okay
              </Button>
            </div>
          </div>
        </Modal>

        {/* ── Request Access Modal ── */}
        <Modal
          isOpen={isRequestAccessModalOpen}
          onRequestClose={() => setIsRequestAccessModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          overlayClassName={overlayClasses}
          ariaHideApp={ARIA_HIDE_APP}
        >
          <div className={modalClasses}>
            <RequestAccess onClose={() => setIsRequestAccessModalOpen(false)} />
          </div>
        </Modal>

        <ToastNotification theme={theme} />
      </AppMuiThemeProvider>
    </SessionContextProvider>
  );
};

export default LandingPage;