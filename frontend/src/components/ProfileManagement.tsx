import React, { useState, useEffect } from 'react';
import {
  TextField,
  Box,
  Button,
  Typography,
  Tooltip,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Fab,
  Switch,
  Checkbox,
  FormControlLabel,
  // FormLabel,
  List,
  ListItemButton,
  ListItemText,
  // Chip,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  ListItemIcon,
} from '@mui/material';
import Avatar from '@components/Avatar';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
// import { sendPasswordReset } from '@lib/authHelpers';
import { Bell, Calendar, CreditCard, Eye, EyeOff, Palette, ThumbsUp, Trash, User2, Zap } from 'lucide-react';
import appColors, { PaletteKey } from '@styles/appColors';
import NotificationsSettings from './NotificationsSettings';
import CalendarIntegration from './CalendarIntegration';
import { COMMON_TIMEZONES, getBrowserTimezone } from '@utils/timezone';
import { usePomodoroSettings } from '@hooks/usePomodoroSettings';
import AffirmationSettings from '@components/affirmations/AffirmationSettings';
import { useTier } from '@hooks/useTier';

type PreferencesTab = 'profile' | 'appearance' | 'notifications' | 'calendar' | 'focus' | 'affirmations' | 'subscription';

interface ProfileManagementProps {
  onClose?: () => void;
  initialTab?: PreferencesTab;
}

// ── Subscription Panel ──────────────────────────────────────────────
const SubscriptionPanel: React.FC = () => {
  const { status, isPaid, isFree, refresh } = useTier();
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = (path: string) => { window.location.href = path; };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/.netlify/functions/createPortalSession', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      notifyError('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const tierLabel = status.tier === 'one_time' ? 'Lifetime (1 Year)' : status.tier === 'subscription' ? 'Subscription' : 'Free';

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold text-primary-text">Subscription & Billing</h2>

      <div className="rounded-lg border border-gray-20 dark:border-gray-70 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary-text">Current Plan</p>
            <p className="text-lg font-semibold text-primary-text">{tierLabel}</p>
          </div>
          {isPaid && status.subscription_status && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              status.subscription_status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
              status.subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {status.subscription_status}
            </span>
          )}
        </div>

        {status.tier_expires_at && (
          <p className="text-sm text-secondary-text">
            {status.tier === 'one_time' ? 'Updates included until' : 'Renews on'}: {new Date(status.tier_expires_at).toLocaleDateString()}
          </p>
        )}

        {isPaid && (
          <Button variant="outlined" size="small" className="!normal-case" disabled={portalLoading} onClick={handleManageBilling}>
            {portalLoading ? 'Loading...' : 'Manage Billing'}
          </Button>
        )}

        {isFree && (
          <Button variant="contained" size="small" className="!normal-case btn-primary" onClick={() => navigate('/pricing')}>
            Upgrade Plan
          </Button>
        )}
      </div>

      {/* Usage summary */}
      <div className="rounded-lg border border-gray-20 dark:border-gray-70 p-5 space-y-3">
        <h3 className="font-medium text-primary-text">Usage This Period</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-secondary-text">Active Goals</p>
            <p className="text-primary-text font-medium">
              {status.active_goal_count}{status.limits.max_active_goals !== null ? ` / ${status.limits.max_active_goals}` : ''}
            </p>
          </div>
          <div>
            <p className="text-secondary-text">Summaries This Week</p>
            <p className="text-primary-text font-medium">
              {status.usage.summary_generation ?? 0}{status.limits.summaries_per_week !== null ? ` / ${status.limits.summaries_per_week}` : ''}
            </p>
          </div>
          <div>
            <p className="text-secondary-text">Plan Generations</p>
            <p className="text-primary-text font-medium">
              {status.usage.plan_generation ?? 0}{status.limits.plan_generations_per_goal !== null ? ` / ${status.limits.plan_generations_per_goal}` : ''}
            </p>
          </div>
          <div>
            <p className="text-secondary-text">AI Focus Chat</p>
            <p className="text-primary-text font-medium">{isPaid ? 'Included' : 'Upgrade required'}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Preferences is the new name for ProfileManagement. The file path remains
// the same for backwards compatibility; exporting a renamed component keeps
// imports simple while updating the UI to a multi-panel Preferences UX.
const Preferences: React.FC<ProfileManagementProps> = ({ onClose, initialTab }) => {
  const { profile, session } = useAuth();
  // Profile form state
  const [username, setUsername] = useState(profile?.username || profile?.email || session?.user?.email || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [timezone, setTimezone] = useState(profile?.timezone || getBrowserTimezone());
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // Appearance state
  // selectedPalette and savingColor are intentionally managed only when saved
  const [previewPalette, setPreviewPalette] = useState<PaletteKey>('purple');
  const [selectedPalette, setSelectedPalette] = useState<PaletteKey>('purple');
  const swatchesRef = React.useRef<HTMLDivElement | null>(null);
  const notificationsSaveRef = React.useRef<(() => Promise<void>) | null>(null);

  // Simple UI state: which panel is active
  const [active, setActive] = useState<PreferencesTab>(initialTab || 'profile');

  // Read sessionStorage deep-link on mount (useEffect survives StrictMode double-mount)
  useEffect(() => {
    try {
      const requested = sessionStorage.getItem('wkly_prefs_tab') as PreferencesTab | null;
      if (requested) {
        sessionStorage.removeItem('wkly_prefs_tab');
        setActive(requested);
      }
    } catch { /* ignore */ }
  }, []);

  const { settings: pomodoroSettings, updateSettings: updatePomodoroSettings } = usePomodoroSettings();

  const [savingAll, setSavingAll] = useState(false);
  // Local password state for optional in-profile password reset UI
  const [password, setPassword] = useState('')
  const [passwordReEnter, setPasswordReEnter] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordReEnter, setShowPasswordReEnter] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const [registerErrors, setRegisterErrors] = useState<{ password?: string; passwordReEnter?: string }>({})
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || profile.email || session?.user?.email || '');
      setEmail(profile.email || '');
      setTimezone(profile.timezone || getBrowserTimezone());
      // Don't overwrite removeAvatar state if the user has explicitly removed their avatar
      if (!removeAvatar) {
        setPreviewSrc(profile.avatar_url || undefined);
      }
      try {
        const pref: PaletteKey | undefined = profile.primary_color;
        if (pref) setSelectedPalette(pref);
        else {
          const stored = appColors.getStoredPalette();
          if (stored) setSelectedPalette(stored as PaletteKey);
        }
        // initialize preview to the selected/saved palette
        setPreviewPalette(pref || (appColors.getStoredPalette() as PaletteKey) || 'purple');
      } catch (e) {
        // ignore
      }
    }
  }, [profile, removeAvatar]);

  const passwordsMatch = !!password && !!passwordReEnter && password === passwordReEnter

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setPreviewSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Profile update: username, avatar, and also persist selected palette so
  // the Profile -> Save button remains holistic for basic preferences.
  const handleUpdateProfile = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');

      if (!username) {
        notifyError('Username is required.');
        setLoading(false);
        return;
      }

      let avatarFilePath: string | null = null;
      let avatarPublicUrl: string | null = null;

      // Handle avatar removal
      if (removeAvatar) {
        const { error: removeErr } = await supabase.from('profiles').upsert(
          { id: session.user.id, avatar_url: null },
          { onConflict: 'id' }
        );
        if (removeErr) throw removeErr;
        window.dispatchEvent(new CustomEvent('avatar:updated', { detail: { avatarUrl: null } }));
      }

      if (avatarFile) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
        if (!allowedTypes.includes(avatarFile.type)) {
          notifyError('Only PNG, JPG, and SVG files are allowed.');
          setLoading(false);
          return;
        }
        if (avatarFile.size === 0) {
          notifyError('The file is empty.');
          setLoading(false);
          return;
        }

        const timestamp = Date.now();
        const avatarFileName = `${session.user.id}-${timestamp}.png`;
        avatarFilePath = `avatars/${avatarFileName}`;

        const uploadResult = await supabase.storage.from('Avatars').upload(avatarFilePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });

        const { error: uploadError } = uploadResult;
        if (uploadError) {
          notifyError('Failed to upload avatar.');
          console.error('Upload error:', uploadError);
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage.from('Avatars').getPublicUrl(avatarFilePath);
        if (publicUrlData?.publicUrl) avatarPublicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        username,
        email,
        timezone,
        avatar_url: removeAvatar ? null : (avatarPublicUrl || profile?.avatar_url),
      }, { onConflict: 'id' });

      if (error) throw error;

      if (removeAvatar) setRemoveAvatar(false);

      // Dispatch event to notify all Avatar components to update
      if (avatarPublicUrl) {
        window.dispatchEvent(new CustomEvent('avatar:updated', { detail: { avatarUrl: avatarPublicUrl } }));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      notifyError('Failed to update profile.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Appearance helpers (palette selection + save/reset)
  const handleSelectPalette = (key: PaletteKey) => {
    // selecting a palette updates only the preview palette. The selection
    // becomes global only when the user saves.
    try {
      setPreviewPalette(key);
    } catch (e) {
      console.warn('Failed to set preview palette', e);
    }
  };

  const handleSavePaletteOnly = async (palette?: PaletteKey) => {
    const toSave = palette || selectedPalette;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');
      const { error } = await supabase.from('profiles').upsert({ id: session.user.id, primary_color: toSave }, { onConflict: 'id' });
      if (error) throw error;
      // apply globally only when saved
      appColors.applyPaletteToRoot(toSave);
      // keep selectedPalette in sync
      setSelectedPalette(toSave);
      // notifySuccess('Primary color saved');
    } catch (e) {
      console.error(e);
      notifyError('Failed to save primary color');
    }
  };

  // removed unused handleResetColors (was causing linter warning)

  // Keyboard navigation for swatches
  const handleSwatchKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const keys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const swatchButtons = swatchesRef.current?.querySelectorAll<HTMLButtonElement>('button[data-swatch]');
    if (!swatchButtons || swatchButtons.length === 0) return;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % swatchButtons.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + swatchButtons.length) % swatchButtons.length;
    const btn = swatchButtons[next];
    btn?.focus();
    btn?.click();
  };

  return (
    <div className="profile-management p-0 m-0 flex flex-col sm:flex-row gap-4">
      {/* Left: vertical menu */}
      <aside className="w-full sm:w-1/4">
        <nav aria-label="Preferences">
          <List className='profile-nav w-full flex flex-row gap-0 sm:flex-col'>
            <ListItemButton className='flex flex-col items-center justify-center sm:flex-row' selected={active === 'profile'} onClick={() => setActive('profile')}>
              <ListItemText className='hidden sm:flex sm:flex-col' primary="Profile" secondary="Username, avatar, email" />
              <ListItemIcon className='flex justify-center sm:hidden'><User2 /></ListItemIcon>
              <ListItemText className='sm:hidden flex text-[0.65em]' primary="Profile" />
            </ListItemButton>
            <ListItemButton className='flex flex-col items-center justify-center sm:flex-row' selected={active === 'appearance'} onClick={() => setActive('appearance')}>
              <ListItemText className='hidden sm:flex sm:flex-col' primary="Appearance" secondary="Theme & primary color" />
              <ListItemIcon className='flex justify-center sm:hidden'><Palette /></ListItemIcon>
              <ListItemText className='sm:hidden flex text-[0.65em]' primary="Appearance" />
            </ListItemButton>
            <ListItemButton className='flex flex-col items-center justify-center sm:flex-row' selected={active === 'notifications'} onClick={() => setActive('notifications')}>
              <ListItemText className='hidden sm:flex sm:flex-col' primary="Notifications" secondary="Slack & Email reminders" />
              <ListItemIcon className='flex justify-center sm:hidden'><Bell /></ListItemIcon>
              <ListItemText className='sm:hidden flex text-[0.65em]' primary="Notifications" />
            </ListItemButton>
            <ListItemButton className='flex flex-col items-center justify-center sm:flex-row' selected={active === 'calendar'} onClick={() => setActive('calendar')}>
              <ListItemText className='hidden sm:flex sm:flex-col' primary="Calendar" secondary="iCal / Google Calendar sync" />
              <ListItemIcon className='flex justify-center sm:hidden'><Calendar /></ListItemIcon>
              <ListItemText className='sm:hidden flex text-[0.65em]' primary="Calendar" />
            </ListItemButton>
            <ListItemButton className='flex flex-col items-center justify-center sm:flex-row' selected={active === 'focus'} onClick={() => setActive('focus')}>
              <ListItemText className='hidden sm:flex sm:flex-col' primary="Focus" secondary="Timer mode & Pomodoro" />
              <ListItemIcon className='flex justify-center sm:hidden'><Zap /></ListItemIcon>
              <ListItemText className='sm:hidden flex text-[0.65em]' primary="Focus" />
            </ListItemButton>
            <ListItemButton className='flex flex-col items-center justify-center sm:flex-row' selected={active === 'affirmations'} onClick={() => setActive('affirmations')}>
              <ListItemText className='hidden sm:flex sm:flex-col' primary="Affirmations" secondary="Daily absurdity & submissions" />
              <ListItemIcon className='flex justify-center sm:hidden'><ThumbsUp /></ListItemIcon>
              <ListItemText className='sm:hidden flex text-[0.65em]' primary="Affirmations" />
            </ListItemButton>
            <ListItemButton className='flex flex-col items-center justify-center sm:flex-row' selected={active === 'subscription'} onClick={() => setActive('subscription')}>
              <ListItemText className='hidden sm:flex sm:flex-col' primary="Subscription" secondary="Plan, billing & usage" />
              <ListItemIcon className='flex justify-center sm:hidden'><CreditCard /></ListItemIcon>
              <ListItemText className='sm:hidden flex text-[0.65em]' primary="Plan" />
            </ListItemButton>
          </List>
        </nav>
      </aside>

      {/* Right: panel */}
      <main className="flex-1">
        {active === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex flex-col items-center gap-4 mb-4">
              <Avatar isEdit onChange={handleAvatarChange} src={removeAvatar ? undefined : previewSrc} uploading={loading} size="lg" showLabel />
              {(previewSrc || profile?.avatar_url) && !removeAvatar && (
                <button
                  type="button"
                  className="text-xs text-secondary-text hover:text-red-500 underline transition-colors"
                  onClick={() => {
                    setRemoveAvatar(true);
                    setPreviewSrc(undefined);
                    setAvatarFile(null);
                  }}
                >
                  <Trash className="w-3 h-3 inline-block mr-1" />
                  Remove image
                </button>
              )}
              <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth />
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
              
              <FormControl fullWidth>
                <InputLabel id="timezone-label">Timezone</InputLabel>
                <Select
                  labelId="timezone-label"
                  id="timezone-select"
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
              
              <div className="w-full flex justify-start">
                <FormControlLabel
                    control={
                      <Switch
                        checked={changePassword}
                        onChange={(e) => setChangePassword(e.target.checked)}
                        inputProps={{ 'aria-label': 'Change password' }}
                      />
                    }
                    label="Change password"
                    className='mt-8'
                  />
              </div>
            
              {changePassword && (
              
                <Paper className="w-full p-4">
                    <TextField
                      id="register-password"
                      name="new-password"
                      autoComplete="new-password"
                      inputProps={{ autoComplete: 'new-password' }}
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setRegisterErrors((s) => ({ ...s, password: undefined })); }}

                      fullWidth
                      size="small"
                      error={!!registerErrors.password}
                      helperText={registerErrors.password}
                          //  // variant="outlined"
                          InputProps={{
                            endAdornment: (
                              <IconButton
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword((s) => !s)}
                                edge="end"
                                size="small"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </IconButton>
                            ),
                          }}
                          sx={{ mb: 1}}
                        />
                        <TextField
                          id="register-reenter"
                          name="new-password-confirm"
                          autoComplete="new-password"
                          inputProps={{ autoComplete: 'new-password' }}
                          label="Re-enter Password"
                          type={showPasswordReEnter ? 'text' : 'password'}
                          value={passwordReEnter}
                          onChange={(e) => { setPasswordReEnter(e.target.value); setRegisterErrors((s) => ({ ...s, passwordReEnter: undefined })); }}

                          fullWidth
                          size="small"
                          error={!!registerErrors.passwordReEnter || (!!passwordReEnter && !passwordsMatch)}
                          helperText={registerErrors.passwordReEnter || ((passwordReEnter && !passwordsMatch) ? 'Passwords do not match.' : '')}
                          InputProps={{
                            endAdornment: (
                              <IconButton
                                aria-label={showPasswordReEnter ? 'Hide re-entered password' : 'Show re-entered password'}
                                onClick={() => setShowPasswordReEnter((s) => !s)}
                                edge="end"
                                size="small"
                              >
                                {showPasswordReEnter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </IconButton>
                            ),
                          }}
                          sx={{ mb: 1 }}
                        />
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                        <div className="mt-2 flex gap-2">
                          
                          <Button
                            variant="contained"
                            color="primary"
                            disabled={!passwordsMatch || !password}
                            onClick={async () => {
                              // Change password in-place for authenticated users
                              setError(null)
                              if (!passwordsMatch) {
                                setRegisterErrors((s) => ({ ...s, passwordReEnter: 'Passwords do not match.' }))
                                return
                              }

                              try {
                                setLoading(true)
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session?.user?.id) {
                                  notifyError('Not authenticated');
                                  setError('Not authenticated');
                                  return;
                                }

                                // Supabase v2: updateUser accepts an object with password
                                // (falls back harmlessly if running a different SDK)
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                const { error: updateErr } = await supabase.auth.updateUser({ password });

                                if (updateErr) {
                                  console.error('Error updating password:', updateErr)
                                  notifyError('Failed to change password: ' + (updateErr.message || updateErr.toString()))
                                  setError(updateErr.message || 'Failed to change password')
                                  return
                                }

                                notifySuccess('Password changed successfully. Use the new password next time you sign in.')
                                // Clear local password fields
                                setPassword('')
                                setPasswordReEnter('')
                                setRegisterErrors({})
                              } catch (err: any) {
                                console.error('Unexpected error changing password:', err)
                                notifyError(err?.message || 'Failed to change password')
                                setError(err?.message || 'Failed to change password')
                              } finally {
                                setLoading(false)
                              }
                            }}
                          >Change password</Button>
                        </div>
                </Paper>
              
              )}
            </div>
          </form>
        )}
        {active === 'appearance' && (
          <section>
            <Typography variant="h6" className="mb-8">Choose a theme</Typography>
            <div ref={swatchesRef} role="listbox" aria-label="Primary color" className="flex gap-3 items-center mt-4 mb-4">
              {(['gray','red','teal','green','blue','indigo','purple'] as PaletteKey[]).map((k, idx) => (
                <button
                  key={k}
                  data-swatch
                  id={`swatch-${k}`}
                  type="button"
                  onKeyDown={(e) => handleSwatchKeyDown(e, idx)}
                  className={`w-10 h-10 rounded-full border-2 focus:outline-none ${previewPalette===k? 'ring-4 ring-offset-2 ring-brand-30':''}`}
                  style={{ background: `linear-gradient(180deg, ${appColors.PALETTES[k][30]} 0%, ${appColors.PALETTES[k][60]} 100%)` }}
                  aria-label={`Choose ${k} primary color`}
                  aria-checked={previewPalette===k}
                  role="option"
                  onClick={() => handleSelectPalette(k)}
                />
              ))}
            </div>
            <Box className="mt-8 pt-4">
              <Typography variant="subtitle1" className="mb-2">Theme preview</Typography>
                <div className="mt-2 p-4 rounded border" style={{ borderColor: appColors.PALETTES[previewPalette][40], transition: 'border-color 220ms ease' }}>
                <AppBar
                  position="static"
                  elevation={0}
                  sx={{
                    borderRadius: 1,
                    backgroundColor: appColors.PALETTES[previewPalette][60],
                    color: '#fff',
                  }}
                >
                  <Toolbar variant="dense" sx={{ minHeight: 44 }}>
                    <Typography sx={{ flex: 1, color: '#fff', transition: 'color 220ms ease' }}><strong>Wkly</strong></Typography>
                    <IconButton aria-label="notifications" sx={{ color: '#fff' }}>
                      <Badge
                        badgeContent={3}
                        sx={{ '& .MuiBadge-badge': { backgroundColor: appColors.PALETTES[previewPalette][70], transition: 'background-color 220ms ease' } }}
                      >
                        <span style={{ width: 18, height: 18, display: 'inline-block', background: appColors.PALETTES[previewPalette][30], borderRadius: 4, transition: 'background 220ms ease' }} />
                      </Badge>
                    </IconButton>
                    <Tooltip title="Profile tooltip demo" 
                      sx={{ '& .MuiTooltip-popperArrow': { backgroundColor: appColors.PALETTES[previewPalette][60]}}} arrow>
                      <IconButton sx={{ color: '#fff' }}><span style={{ width: 18, height: 18, display: 'inline-block', background: appColors.PALETTES[previewPalette][30], transition: 'background 220ms ease' }} /></IconButton>
                    </Tooltip>
                  </Toolbar>
                </AppBar>
                <div className="flex gap-4 items-center mt-4">
                  <Fab
                    size='small'
                    aria-label='demo-fab'
                    sx={{ backgroundColor: appColors.PALETTES[previewPalette][60], color: '#fff', transition: 'background-color 220ms ease' }}
                  ><strong>+</strong></Fab>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={true}
                        onChange={() => {}}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: appColors.PALETTES[previewPalette][30] },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: appColors.PALETTES[previewPalette][30] },
                          transition: 'all 220ms ease'
                        }}
                      />
                    }
                    label='Switch'
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={true}
                        onChange={() => {}}
                        sx={{
                          color: appColors.PALETTES[previewPalette][60],
                          '&.Mui-checked .MuiSvgIcon-root': { color: appColors.PALETTES[previewPalette][40] },
                          transition: 'color 220ms ease'
                        }}
                      />
                    }
                    label='Checkbox'
                  />
                </div>
              </div>
            </Box>
          </section>
        )}

        
        {active === 'notifications' && (
          <section>
            <NotificationsSettings registerSave={(fn) => { notificationsSaveRef.current = fn; }} />
          </section>
        )}

        {active === 'calendar' && (
          <section>
            <CalendarIntegration />
          </section>
        )}

        {active === 'focus' && (
          <section className="space-y-6 p-2">
            <div>
              <Typography variant="h6" gutterBottom>Focus Timer</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Choose your timer style and configure Pomodoro intervals.
              </Typography>
            </div>

            {/* Timer mode */}
            <div className="space-y-2">
              <Typography variant="subtitle2">Timer mode</Typography>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'pomodoro', label: 'Pomodoro (default)', desc: 'Countdown with focus/break phases, notifications & sounds' },
                  { value: 'basic', label: 'Basic stopwatch', desc: 'Simple count-up timer — no phases or interruptions' },
                ] as const).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updatePomodoroSettings({ timerMode: value })}
                    className={`text-left w-full rounded-lg border px-4 py-3 transition-colors ${
                      pomodoroSettings.timerMode === value
                        ? 'border-primary bg-brand-10 dark:bg-brand-90'
                        : 'border-gray-20 dark:border-gray-70 hover:border-primary'
                    }`}
                  >
                    <p className="text-sm font-semibold text-primary-text">{label}</p>
                    <p className="text-xs text-secondary-text mt-0.5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pomodoro settings (only when pomodoro mode selected) */}
            {pomodoroSettings.timerMode === 'pomodoro' && (
              <>
                {/* Intervals */}
                <div className="space-y-3">
                  <Typography variant="subtitle2">Interval durations</Typography>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Focus (min)', field: 'focusMinutes' as const, min: 1, max: 120, value: pomodoroSettings.focusMinutes },
                      { label: 'Short break', field: 'shortBreakMinutes' as const, min: 1, max: 60, value: pomodoroSettings.shortBreakMinutes },
                      { label: 'Long break', field: 'longBreakMinutes' as const, min: 1, max: 120, value: pomodoroSettings.longBreakMinutes },
                    ].map(({ label, field, min, max, value }) => (
                      <div key={field} className="flex flex-col gap-1">
                        <label className="text-xs text-secondary-text">{label}</label>
                        <input
                          type="number"
                          value={value}
                          min={min}
                          max={max}
                          onChange={(e) => updatePomodoroSettings({ [field]: Math.max(min, Math.min(max, Number(e.target.value))) })}
                          className="border border-gray-30 dark:border-gray-60 bg-background-color rounded px-2 py-1.5 text-sm text-center w-full"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-secondary-text">Sessions before long break</label>
                    <input
                      type="number"
                      value={pomodoroSettings.longBreakInterval}
                      min={1}
                      max={10}
                      onChange={(e) => updatePomodoroSettings({ longBreakInterval: Math.max(1, Math.min(10, Number(e.target.value))) })}
                      className="border border-gray-30 dark:border-gray-60 bg-background-color rounded px-2 py-1.5 text-sm text-center w-24"
                    />
                  </div>
                </div>

                {/* Quick presets */}
                <div className="space-y-2">
                  <Typography variant="subtitle2">Presets</Typography>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '25/5/15', focusMinutes: 25, shortBreakMinutes: 5,  longBreakMinutes: 15, longBreakInterval: 4 },
                      { label: '50/10/30', focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 30, longBreakInterval: 3 },
                      { label: '90/20/30', focusMinutes: 90, shortBreakMinutes: 20, longBreakMinutes: 30, longBreakInterval: 2 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => updatePomodoroSettings(preset)}
                        className="btn-secondary text-xs px-3 py-1 rounded-full"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-start */}
                <div className="space-y-1">
                  <Typography variant="subtitle2">Auto-start</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={pomodoroSettings.autoStartBreaks}
                        onChange={(e) => updatePomodoroSettings({ autoStartBreaks: e.target.checked })}
                      />
                    }
                    label={<span className="text-sm">Auto-start breaks</span>}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={pomodoroSettings.autoStartFocus}
                        onChange={(e) => updatePomodoroSettings({ autoStartFocus: e.target.checked })}
                      />
                    }
                    label={<span className="text-sm">Auto-start next focus session</span>}
                  />
                </div>

                {/* Sounds & notifications */}
                <div className="space-y-1">
                  <Typography variant="subtitle2">Alerts</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={pomodoroSettings.soundEnabled}
                        onChange={(e) => updatePomodoroSettings({ soundEnabled: e.target.checked })}
                      />
                    }
                    label={<span className="text-sm">Play sound when phase ends</span>}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={pomodoroSettings.notificationsEnabled}
                        onChange={(e) => updatePomodoroSettings({ notificationsEnabled: e.target.checked })}
                      />
                    }
                    label={<span className="text-sm">Browser notifications</span>}
                  />
                </div>
              </>
            )}
          </section>
        )}
        {active === 'affirmations' && (
          <section>
            <AffirmationSettings />
          </section>
        )}
        {active === 'subscription' && (
          <SubscriptionPanel />
        )}

        {/* Footer: single Save All / Cancel */}
        <footer className="flex bg-transparent w-full justify-end p-3 rounded shadow space-x-2">
          <Button variant="outlined" onClick={() => onClose && onClose()}>Cancel</Button>
          <Button variant="contained" color="primary" disabled={savingAll} onClick={async () => {
            setSavingAll(true);
            try {
              // Save profile (username/email/avatar)
              await handleUpdateProfile();
              // Save appearance (persist preview palette)
              await handleSavePaletteOnly(previewPalette);
              // Save notifications if the child registered a save
              if (notificationsSaveRef.current) {
                await notificationsSaveRef.current();
              }
              notifySuccess('Preferences saved');
              // Close after successful save
              if (onClose) onClose();
            } catch (e) {
              console.error('Failed to save preferences:', e);
              notifyError('Failed to save preferences');
            } finally {
              setSavingAll(false);
            }
          }}>{savingAll ? 'Saving...' : 'Save all'}</Button>
        </footer>
      </main>
      
    </div>
  );
};

export default Preferences;