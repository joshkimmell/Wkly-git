import React, { useState, useEffect } from 'react';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
import Avatar from '@components/Avatar';
import { COMMON_TIMEZONES, getBrowserTimezone } from '@utils/timezone';
import appColors, { PaletteKey } from '@styles/appColors';
import { usePomodoroSettings } from '@hooks/usePomodoroSettings';
import { notifyError } from '@components/ToastyNotification';
import { updateAffirmationPreferences } from '@utils/affirmationApi';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
} from '@mui/material';
import {
  ChevronRight,
  ChevronLeft,
  Target,
  Palette,
  Timer,
  Rocket,
  User2,
  Sparkles,
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────

export const ONBOARDING_KEY = 'wkly_onboarding_complete';

const PALETTE_KEYS: PaletteKey[] = ['gray', 'red', 'teal', 'green', 'blue', 'indigo', 'purple'];

const PALETTE_NAMES: Record<PaletteKey, string> = {
  gray: 'Slate',
  red: 'Crimson',
  teal: 'Teal',
  green: 'Emerald',
  blue: 'Ocean',
  indigo: 'Indigo',
  purple: 'Violet',
};

const QUICK_AFFIRMATION_CATEGORIES = [
  'General',
  'Productivity',
  'Growth',
  'Wellness',
  'Mindfulness',
  'Optimism',
  'Satire',
];

type StepId = 'welcome' | 'profile' | 'appearance' | 'focus' | 'affirmations' | 'goal';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'focus', label: 'Focus' },
  { id: 'affirmations', label: 'Daily Dose' },
  { id: 'goal', label: 'First Goal' },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface OnboardingAssistantProps {
  onComplete: (createGoal: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const OnboardingAssistant: React.FC<OnboardingAssistantProps> = ({ onComplete }) => {
  const { profile, session } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Profile state ──
  const [username, setUsername] = useState('');
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined);

  // ── Appearance state ──
  const [palette, setPalette] = useState<PaletteKey>('purple');

  // ── Focus state ──
  const { settings: pomodoroSettings, updateSettings: updatePomodoroSettings } = usePomodoroSettings();

  // ── Affirmations state ──
  const [affirmationEnabled, setAffirmationEnabled] = useState(true);
  const [affirmationTime, setAffirmationTime] = useState('09:00');
  const [affirmationCategories, setAffirmationCategories] = useState<string[]>([
    'General',
    'Productivity',
    'Growth',
  ]);

  // ── Initialize from profile ──
  useEffect(() => {
    if (!profile) return;
    if (profile.username && !profile.username.includes('@')) {
      setUsername(profile.username);
    }
    if (profile.timezone) setTimezone(profile.timezone);
    if (profile.avatar_url) setPreviewSrc(profile.avatar_url);
    if (profile.primary_color) setPalette(profile.primary_color as PaletteKey);
  }, [profile]);

  // ── Apply palette preview in real-time ──
  useEffect(() => {
    appColors.applyPaletteToRoot(palette);
  }, [palette]);

  // ── Avatar handler ──
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Affirmation category toggle ──
  const toggleAffirmationCategory = (cat: string) => {
    setAffirmationCategories((prev) => {
      if (prev.includes(cat)) {
        const next = prev.filter((c) => c !== cat);
        return next.length === 0 ? ['General'] : next;
      }
      return [...prev, cat];
    });
  };

  // ── Save everything and complete ──
  const saveAll = async (createGoal: boolean) => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      // 1. Avatar upload (optional)
      let avatarPublicUrl: string | null = null;
      if (avatarFile) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!allowedTypes.includes(avatarFile.type)) {
          notifyError('Only PNG, JPG, and SVG files are allowed.');
          setSaving(false);
          return;
        }
        const timestamp = Date.now();
        const avatarFilePath = `avatars/${session.user.id}-${timestamp}.png`;
        const { error: uploadError } = await supabase.storage
          .from('Avatars')
          .upload(avatarFilePath, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('Avatars')
            .getPublicUrl(avatarFilePath);
          if (urlData?.publicUrl) {
            avatarPublicUrl = `${urlData.publicUrl}?t=${timestamp}`;
          }
        }
      }

      // 2. Save profile + palette in one upsert
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: session.user.id,
          username: username.trim() || profile?.email || session.user.email,
          timezone,
          primary_color: palette,
          avatar_url: avatarPublicUrl || profile?.avatar_url || null,
        },
        { onConflict: 'id' }
      );
      if (profileError) throw profileError;

      appColors.applyPaletteToRoot(palette);

      if (avatarPublicUrl) {
        window.dispatchEvent(
          new CustomEvent('avatar:updated', { detail: { avatarUrl: avatarPublicUrl } })
        );
      }

      // 3. Save affirmation preferences
      await updateAffirmationPreferences({
        daily_notification: affirmationEnabled,
        notification_time: affirmationTime,
        preferred_categories: affirmationCategories,
      });

      localStorage.setItem(ONBOARDING_KEY, '1');
      onComplete(createGoal);
    } catch (err) {
      console.error('[OnboardingAssistant] Save error:', err);
      notifyError('Could not save all preferences — you can update them in Settings later.');
      // Don't block the user; still mark complete
      localStorage.setItem(ONBOARDING_KEY, '1');
      onComplete(createGoal);
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation ──
  const handleNext = () => {
    if (stepIndex === 1 && !username.trim()) {
      notifyError('Please enter a username to continue.');
      return;
    }
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((s) => s - 1);
  };

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const progressPercent = (stepIndex / (STEPS.length - 1)) * 100;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Account setup wizard"
    >
      <div className="bg-gray-10 dark:bg-gray-90 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Top progress bar */}
        <div className="h-1 bg-gray-20 dark:bg-gray-80">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="p-6 sm:p-8">
          {/* Step indicator row */}
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-medium text-secondary-text uppercase tracking-widest">
              {stepIndex === 0 ? 'Getting started' : `Step ${stepIndex} of ${STEPS.length - 1}`}
            </span>
            <div className="flex gap-1.5 items-center">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === stepIndex
                      ? 'w-5 h-2 bg-primary'
                      : i < stepIndex
                      ? 'w-2 h-2 bg-primary opacity-40'
                      : 'w-2 h-2 bg-gray-30 dark:bg-gray-70'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── Step 0: Welcome ────────────────────────────────────── */}
          {currentStep.id === 'welcome' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-10 dark:bg-brand-90 mb-2">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-text">
                Welcome to Wkly!
              </h1>
              <p className="text-secondary-text text-sm leading-relaxed max-w-xs mx-auto">
                Let's take 2 minutes to personalize your experience — profile, theme, focus style, and daily motivation.
              </p>
              <p className="text-xs text-secondary-text/60 mt-1">
                Everything can be changed later in Settings.
              </p>
            </div>
          )}

          {/* ── Step 1: Profile ────────────────────────────────────── */}
          {currentStep.id === 'profile' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-10 dark:bg-brand-90">
                  <User2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary-text leading-tight">Your Profile</h2>
                  <p className="text-xs text-secondary-text">Name, photo, and timezone</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <Avatar
                  isEdit
                  onChange={handleAvatarChange}
                  src={previewSrc}
                  uploading={false}
                  size="lg"
                  showLabel
                />
              </div>

              <TextField
                label="Username *"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                size="small"
                placeholder="How should we call you?"
                autoFocus
                inputProps={{ maxLength: 40 }}
              />

              <FormControl fullWidth size="small">
                <InputLabel id="tz-onboard-label">Timezone</InputLabel>
                <Select
                  labelId="tz-onboard-label"
                  value={timezone}
                  label="Timezone"
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
          )}

          {/* ── Step 2: Appearance ─────────────────────────────────── */}
          {currentStep.id === 'appearance' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-10 dark:bg-brand-90">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary-text leading-tight">Pick a Color Theme</h2>
                  <p className="text-xs text-secondary-text">Your accent color across the whole app</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {PALETTE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={`${PALETTE_NAMES[k]} theme`}
                    aria-pressed={palette === k}
                    onClick={() => setPalette(k)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                      palette === k
                        ? 'bg-gray-20 dark:bg-gray-80 ring-2 ring-primary'
                        : 'hover:bg-gray-15 dark:hover:bg-gray-80'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${appColors.PALETTES[k][30]} 0%, ${appColors.PALETTES[k][60]} 100%)`,
                      }}
                    />
                    <span className="text-[9px] font-medium text-secondary-text uppercase tracking-wide leading-none">
                      {PALETTE_NAMES[k]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Mini preview strip */}
              <div className="rounded-xl border border-gray-20 dark:border-gray-70 p-4 space-y-2.5 mt-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-7 w-7 rounded-full shadow-sm"
                    style={{ backgroundColor: appColors.PALETTES[palette][60] }}
                  />
                  <div
                    className="h-2 w-24 rounded-full"
                    style={{ backgroundColor: appColors.PALETTES[palette][30] }}
                  />
                  <div className="h-2 w-12 rounded-full bg-gray-20 dark:bg-gray-70 ml-auto" />
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-20 dark:bg-gray-70" />
                <div className="h-1.5 w-3/4 rounded-full bg-gray-20 dark:bg-gray-70" />
                <div
                  className="inline-flex items-center px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: appColors.PALETTES[palette][60] }}
                >
                  <span className="text-[10px] text-white font-semibold">Button</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Focus ──────────────────────────────────────── */}
          {currentStep.id === 'focus' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-10 dark:bg-brand-90">
                  <Timer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary-text leading-tight">Focus Style</h2>
                  <p className="text-xs text-secondary-text">Choose how you like to time your work sessions</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {(
                  [
                    {
                      value: 'pomodoro',
                      label: 'Pomodoro',
                      desc: 'Structured focus/break cycles with notifications & sounds',
                    },
                    {
                      value: 'basic',
                      label: 'Stopwatch',
                      desc: 'Simple count-up timer — no phases or interruptions',
                    },
                  ] as const
                ).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updatePomodoroSettings({ timerMode: value })}
                    className={`text-left w-full rounded-xl border-2 px-4 py-3 transition-all ${
                      pomodoroSettings.timerMode === value
                        ? 'border-primary bg-brand-10 dark:bg-brand-90'
                        : 'border-gray-20 dark:border-gray-70 hover:border-primary'
                    }`}
                  >
                    <p className="text-sm font-semibold text-primary-text flex items-center gap-2">
                      <Timer className="w-4 h-4 text-primary flex-shrink-0" />
                      {label}
                      {pomodoroSettings.timerMode === value && (
                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary">
                          Selected
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-secondary-text mt-0.5 ml-6">{desc}</p>
                  </button>
                ))}
              </div>

              {pomodoroSettings.timerMode === 'pomodoro' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-secondary-text uppercase tracking-wide">
                    Quick preset
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      {
                        label: '25/5 Classic',
                        focusMinutes: 25,
                        shortBreakMinutes: 5,
                        longBreakMinutes: 15,
                        longBreakInterval: 4,
                      },
                      {
                        label: '50/10 Deep',
                        focusMinutes: 50,
                        shortBreakMinutes: 10,
                        longBreakMinutes: 30,
                        longBreakInterval: 3,
                      },
                      {
                        label: '90/20 Flow',
                        focusMinutes: 90,
                        shortBreakMinutes: 20,
                        longBreakMinutes: 30,
                        longBreakInterval: 2,
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => updatePomodoroSettings(preset)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          pomodoroSettings.focusMinutes === preset.focusMinutes
                            ? 'border-primary bg-brand-10 dark:bg-brand-90 text-primary font-semibold'
                            : 'border-gray-20 dark:border-gray-70 text-secondary-text hover:border-primary'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Affirmations ───────────────────────────────── */}
          {currentStep.id === 'affirmations' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-10 dark:bg-brand-90">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary-text leading-tight">Daily Dose</h2>
                  <p className="text-xs text-secondary-text">A daily affirmation — funny, warm, and slightly unhinged</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-brand-0/60 dark:bg-gray-80/30">
                <div>
                  <p className="text-sm font-semibold text-primary-text">Daily notification</p>
                  <p className="text-xs text-secondary-text mt-0.5">
                    Get your affirmation delivered every morning
                  </p>
                </div>
                <Switch
                  checked={affirmationEnabled}
                  onChange={(e) => setAffirmationEnabled(e.target.checked)}
                  size="small"
                />
              </div>

              {affirmationEnabled && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-0/60 dark:bg-gray-80/30">
                  <span className="text-sm text-secondary-text">Deliver at</span>
                  <input
                    type="time"
                    value={affirmationTime}
                    onChange={(e) => setAffirmationTime(e.target.value)}
                    className="rounded-lg border border-gray-20 dark:border-gray-70 bg-transparent px-3 py-1.5 text-sm text-primary-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-secondary-text uppercase tracking-wide">
                  Preferred categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_AFFIRMATION_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleAffirmationCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        affirmationCategories.includes(cat)
                          ? 'bg-brand-60 dark:bg-brand-30 text-white dark:text-gray-90'
                          : 'bg-gray-10 dark:bg-gray-80 text-secondary-text hover:bg-brand-10 dark:hover:bg-gray-70 border border-gray-20 dark:border-gray-70'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: First Goal ─────────────────────────────────── */}
          {currentStep.id === 'goal' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-10 dark:bg-brand-90 mb-2">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-primary-text">You're all set!</h2>
              <p className="text-secondary-text text-sm leading-relaxed max-w-xs mx-auto">
                Your profile and preferences are saved. Ready to set your first goal for this week?
              </p>

              <div className="flex flex-col gap-2.5 mt-6 pt-2">
                <button
                  onClick={() => saveAll(true)}
                  disabled={saving}
                  className="btn-primary flex items-center justify-center gap-2 w-full py-3"
                >
                  <Target className="w-4 h-4" />
                  {saving ? 'Saving…' : "Yes, let's create a goal!"}
                </button>
                <button
                  onClick={() => saveAll(false)}
                  disabled={saving}
                  className="btn-ghost text-sm w-full py-2"
                >
                  I'll explore first
                </button>
              </div>
            </div>
          )}

          {/* ── Navigation (all steps except last) ─────────────────── */}
          {!isLastStep && (
            <div className="flex items-center justify-between mt-8">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-ghost flex items-center gap-1 text-sm px-3 py-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex items-center gap-1.5"
              >
                {stepIndex === 0 ? "Let's go" : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingAssistant;
