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
  FormLabel,
  List,
  ListItemButton,
  ListItemText,
  Chip,
} from '@mui/material';
import Avatar from '@components/Avatar';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
import appColors, { PaletteKey } from '@styles/appColors';
import NotificationsSettings from './NotificationsSettings';

interface ProfileManagementProps {
  onClose?: () => void;
}

// Preferences is the new name for ProfileManagement. The file path remains
// the same for backwards compatibility; exporting a renamed component keeps
// imports simple while updating the UI to a multi-panel Preferences UX.
const Preferences: React.FC<ProfileManagementProps> = ({ onClose }) => {
  const { profile } = useAuth();
  // Profile form state
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined);

  // Appearance state
  // selectedPalette and savingColor are intentionally managed only when saved
  const [previewPalette, setPreviewPalette] = useState<PaletteKey>('purple');
  const [selectedPalette, setSelectedPalette] = useState<PaletteKey>('purple');
  const swatchesRef = React.useRef<HTMLDivElement | null>(null);
  const notificationsSaveRef = React.useRef<(() => Promise<void>) | null>(null);

  // Simple UI state: which panel is active
  const [active, setActive] = useState<'profile' | 'appearance' | 'notifications'>('profile');

  const [savingAll, setSavingAll] = useState(false);
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setPreviewSrc(profile.avatar_url || undefined);
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
  }, [profile]);

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

      const { error } = await supabase.from('profiles').update({
        username,
        email,
        avatar_url: avatarPublicUrl || profile?.avatar_url,
      }).eq('id', session.user.id);

      if (error) throw error;

      // notifySuccess('Profile updated successfully!');

      // Optionally close the modal
      if (onClose) onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      notifyError('Failed to update profile.');
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
      const { error } = await supabase.from('profiles').update({ primary_color: toSave }).eq('id', session.user.id);
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

  const handleResetColors = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');
      const { error } = await supabase.from('profiles').update({ primary_color: null }).eq('id', session.user.id);
      if (error) throw error;
      appColors.resetPaletteToDefault();
      setSelectedPalette('purple');
      setPreviewPalette('purple');
      // notifySuccess('Colors reset to default');
    } catch (e) {
      console.error(e);
      notifyError('Failed to reset colors');
    }
  };

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
    <div className="profile-management p-0 flex flex-col sm:flex-row gap-6">
      {/* Left: vertical menu */}
      <aside className="w-full sm:w-64">
        <nav aria-label="Preferences">
          <List className='flex flex-row sm:flex-col'>
            <ListItemButton selected={active === 'profile'} onClick={() => setActive('profile')}>
              <ListItemText primary="Profile" secondary="Username, avatar, email" />
            </ListItemButton>
            <ListItemButton selected={active === 'appearance'} onClick={() => setActive('appearance')}>
              <ListItemText primary="Appearance" secondary="Theme & primary color" />
            </ListItemButton>
            <ListItemButton selected={active === 'notifications'} onClick={() => setActive('notifications')}>
              <ListItemText primary="Notifications" secondary="Slack & Email reminders" />
            </ListItemButton>
          </List>
        </nav>
      </aside>

      {/* Right: panel */}
      <main className="flex-1">
        {active === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex flex-col items-center gap-4 mb-4">
              <Avatar isEdit onChange={handleAvatarChange} src={previewSrc} uploading={loading} size="lg" />
              <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth />
              <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            </div>
          </form>
        )}

        {active === 'appearance' && (
          <section>
            <Typography variant="h6" className="mb-8">Choose a theme</Typography>
            <div ref={swatchesRef} role="listbox" aria-label="Primary color" className="flex gap-3 items-center mt-4 mb-4">
              {(['gray','red','orange','teal','green','blue','indigo','purple'] as PaletteKey[]).map((k, idx) => (
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