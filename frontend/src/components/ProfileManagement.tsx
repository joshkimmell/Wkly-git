import React, { useState, useEffect } from 'react';
import {
  TextField,
  Box,
  Button,
  Chip,
  Typography,
  Avatar as MuiAvatar,
  Tooltip,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Fab,
  Switch,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  FormLabel,
} from '@mui/material';
import Avatar from '@components/Avatar';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
// import {isMenuHidden} from './Header';
import appColors, { PaletteKey } from '@styles/appColors';

interface ProfileManagementProps {
  onClose?: () => void;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ onClose }) => {
  const { profile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // State to hold the selected avatar file
  const [previewSrc, setPreviewSrc] = useState<string | undefined>(undefined); // State for preview image
  const [selectedPalette, setSelectedPalette] = useState<PaletteKey>('purple');
  const [savingColor, setSavingColor] = useState(false);
  const swatchesRef = React.useRef<HTMLDivElement | null>(null);
  // Interactive demo state for previewing components
  const [badgeCount, setBadgeCount] = useState(3);
  const [demoSwitch, setDemoSwitch] = useState(false);
  const [demoCheckbox, setDemoCheckbox] = useState(false);
  const [demoSelect, setDemoSelect] = useState<string>('optionA');
  const [demoText, setDemoText] = useState<string>('Sample text');
  const [demoSubmitted, setDemoSubmitted] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (profile) {
        setUsername(profile.username || '');
        setEmail(profile.email || '');
        // Initialize previewSrc: prefer the stored avatar_url; otherwise leave undefined so Avatar shows the plain initial
        if (profile.avatar_url) {
          setPreviewSrc(profile.avatar_url);
        } else {
          setPreviewSrc(undefined);
        }
        // init palette from profile.primary_color or localStorage
        try {
          const pref: PaletteKey | undefined = profile.primary_color;
          if (pref) setSelectedPalette(pref);
          else {
            const stored = appColors.getStoredPalette();
            if (stored) setSelectedPalette(stored as PaletteKey);
          }
        } catch (e) {
          // ignore
        }
    }
  }, [profile]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file); // Queue up the selected file for upload

      // Generate a preview URL for the selected file
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewSrc(reader.result as string); // Set the preview image source
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent page reload
    setLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error('User not authenticated');

        // Check if username is provided
        if (!username) {
            notifyError('Username is required.');
            setLoading(false);
            return;
        }

        let avatarFilePath = null;
        let avatarPublicUrl = null;

        // If a new avatar file is selected, upload it
        if (avatarFile) {
          const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
          if (!allowedTypes.includes(avatarFile.type)) {
              notifyError('Only PNG, JPG, and SVG files are allowed.');
              setLoading(false);
              return;
          }

          if (avatarFile.size === 0) {
              notifyError('The file is empty. Please upload a valid image.');
              setLoading(false);
              return;
          }

          // Use timestamped filename to avoid caching and ensure uniqueness
          const timestamp = Date.now();
          const avatarFileName = `${session.user.id}-${timestamp}.png`;
          avatarFilePath = `avatars/${avatarFileName}`;

          console.log('Uploading avatar with filename:', avatarFilePath);

          // Ensure the bucket name is correct and handle upload errors
          const uploadResult = await supabase.storage
              .from('Avatars')
              .upload(avatarFilePath, avatarFile, {
                  upsert: true,
                  contentType: avatarFile.type, // Ensure correct MIME type
              });

          console.log('Supabase upload result:', uploadResult);

          const { error: uploadError } = uploadResult;

          if (uploadError) {
              notifyError('Failed to upload avatar. Please check the bucket name and permissions.');
              console.error('Upload error:', uploadError);
              setLoading(false);
              return;
          }

          // Generate the public URL for the uploaded file
          const { data: publicUrlData } = supabase.storage
              .from('Avatars')
              .getPublicUrl(avatarFilePath);

          if (publicUrlData?.publicUrl) {
              // Append a unique query parameter to prevent caching
              avatarPublicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
          }
        }

        // Update profile
          const { error } = await supabase.from('profiles').update({
              username,
              avatar_url: avatarPublicUrl || profile?.avatar_url, // Store the public URL in avatar_url
              primary_color: selectedPalette,
          }).eq('id', session?.user?.id);

        if (error) throw error;

        // Refetch the profile to get the updated avatar_url
        try {
          const { data: refreshedProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!fetchError && refreshedProfile?.avatar_url) {
            setPreviewSrc(refreshedProfile.avatar_url);
          } else if (fetchError) {
            console.warn('Failed to refetch profile after update:', fetchError);
          }

          // Notify other Avatar instances that the avatar changed. Use the refreshed URL if available, otherwise fall back to avatarPublicUrl.
          const finalUrl = refreshedProfile?.avatar_url || avatarPublicUrl;
          if (finalUrl) {
            try {
              window.dispatchEvent(new CustomEvent('avatar:updated', { detail: { avatarUrl: finalUrl } }));
            } catch (e) {
              console.warn('Failed to dispatch avatar:updated event', e);
            }
          }
        } catch (refetchErr) {
          console.warn('Unexpected error refetching profile:', refetchErr);
        }

        notifySuccess('Profile updated successfully!');
        console.log('Profile updated:', { username, avatarFilePath, avatarPublicUrl });

        // Close the profile modal if the parent provided an onClose handler
        if (onClose) {
          try {
            onClose();
          } catch (e) {
            console.warn('onClose handler threw an error', e);
          }
        }
    } catch (error) {
        notifyError('Failed to update profile.');
        console.error('Error updating profile:', error);
    } finally {
        setLoading(false);
    }
  };

  const handleApplyPreview = () => {
    try {
      appColors.applyPaletteToRoot(selectedPalette);
    } catch (e) {
      console.warn('Failed to apply palette preview', e);
    }
  };

  // When a palette is selected, update state and immediately apply the palette
  // for preview (don't rely on setState to have committed yet).
  const handleSelectPalette = (key: PaletteKey) => {
    try {
      setSelectedPalette(key);
      appColors.applyPaletteToRoot(key);
    } catch (e) {
      console.warn('Failed to apply selected palette', e);
    }
  };

  const handleResetColors = async () => {
    setSavingColor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');
      // reset in DB to null
      const { error } = await supabase.from('profiles').update({ primary_color: null }).eq('id', session.user.id);
      if (error) throw error;
      appColors.resetPaletteToDefault();
      setSelectedPalette('purple');
      notifySuccess('Colors reset to default');
    } catch (e) {
      console.error(e);
      notifyError('Failed to reset colors');
    } finally { setSavingColor(false); }
  };

  const handleSavePaletteOnly = async () => {
    setSavingColor(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('User not authenticated');
      const { error } = await supabase.from('profiles').update({ primary_color: selectedPalette }).eq('id', session.user.id);
      if (error) throw error;
      appColors.applyPaletteToRoot(selectedPalette);
      notifySuccess('Primary color saved');
    } catch (e) {
      console.error(e);
      notifyError('Failed to save primary color');
    } finally { setSavingColor(false); }
  };

  // Accessibility: keyboard navigation for swatches (left/right/up/down)
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

  // Simple contrast check between two hex colors. Returns approx contrast ratio.
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#','');
    if (h.length === 3) {
      return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    }
    return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)];
  };
  const luminance = (rgb: [number,number,number]) => {
    const srgb = rgb.map(v => {
      const s = v/255;
      return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055,2.4);
    });
    return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
  };
  const contrastRatio = (hex1:string, hex2:string) => {
    try {
      const a = luminance(hexToRgb(hex1) as [number,number,number]);
      const b = luminance(hexToRgb(hex2) as [number,number,number]);
      const L1 = Math.max(a,b);
      const L2 = Math.min(a,b);
      return (L1+0.05)/(L2+0.05);
    } catch (e) { return 1; }
  };

  return (
    <div className="profile-management">
        <form onSubmit={handleUpdateProfile} className='mt-8 space-y-6 w-[80%] items-center mx-auto'>
            <div className=' flex flex-col items-center gap-4 mb-4'>
                <Avatar
                    isEdit={true}
                    onChange={handleAvatarChange} // Pass the handler to the Avatar component
                    src={previewSrc} // Pass the preview image source
                    uploading={loading} // Show uploading indicator when loading
                    size="lg"
                />

                <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                margin="normal"
                />
                <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                margin="normal"
                />
                
                <div className='w-full mt-4'>
                  <FormLabel component='label' className='mb-2 font-semibold text-xs'>Primary color</FormLabel>
                  <div
                    ref={swatchesRef}
                    role='listbox'
                    aria-label='Primary color'
                    aria-activedescendant={`swatch-${selectedPalette}`}
                    className='flex gap-3 items-center'
                  >
                        {(['gray','red','orange','teal','green','blue','indigo','purple'] as PaletteKey[]).map((k, idx) => (
                      <button
                        key={k}
                        data-swatch
                        id={`swatch-${k}`}
                        type='button'
                        onKeyDown={(e) => handleSwatchKeyDown(e, idx)}
                        className={`w-10 h-10 rounded-full border-2 focus:outline-none focus:ring-2 ${selectedPalette===k? 'ring-4 ring-offset-2 ring-brand-30':''}`}
                            style={{ background: `linear-gradient(180deg, ${appColors.PALETTES[k][30]} 0%, ${appColors.PALETTES[k][60]} 100%)` }}
                        aria-label={`Choose ${k} primary color`}
                        aria-checked={selectedPalette===k}
                        role='option'
                            onClick={() => handleSelectPalette(k)}
                      />
                    ))}
                  </div>
                    <div className='mt-8 flex gap-2 items-start'>
                      {/* <Button variant='outlined' onClick={() => { handleApplyPreview(); }} size='small'>Preview</Button> */}
                      <Button variant='contained' color='primary' onClick={handleSavePaletteOnly} size='small' disabled={savingColor}>{savingColor? 'Saving...' : 'Save color'}</Button>
                      <Button variant='text' onClick={handleResetColors} size='small' disabled={savingColor}>{savingColor? 'Resetting...' : 'Reset to default'}</Button>
                    </div>

                  <Box className='border-t-1 mt-8 pt-4 flex flex-col gap-3'>
                    {/* <div className='flex items-center gap-3'>
                      <Chip label='MUI preview' color='primary' />
                      <Tooltip title='Primary MUI contained button (uses var(--brand-60))'>
                        <Button variant='contained' sx={{ bgcolor: `var(--brand-60)`, color: 'var(--button-text)', '&:hover': { filter: 'brightness(0.95)' } }}>Primary</Button>
                      </Tooltip>
                    </div>

                    <div className='flex items-center gap-3'>
                      <Tooltip title='Avatar border/initial uses brand value'>
                        <MuiAvatar sx={{ bgcolor: 'var(--brand-30)', border: '2px solid var(--brand-20)' }}>U</MuiAvatar>
                      </Tooltip>
                      <div>
                        <FormLabel>App header preview</FormLabel>
                        <div className='mt-1 p-2 rounded flex items-center justify-between' style={{ background: 'var(--brand-70)', color: 'var(--button-text)' }}>
                          <strong>Wkly</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.85rem' }}> Header </span>
                          </div>
                        </div>
                      </div>
                    </div> */}

                    {/* <div className='flex items-center gap-3'>
                      <Typography variant='body2'>Contrast (brand-60 vs text):</Typography>
                      <div className='font-mono'>{(() => {
                        const brand60 = getComputedStyle(document.documentElement).getPropertyValue('--brand-60')?.trim() || '#570082';
                        const text = getComputedStyle(document.documentElement).getPropertyValue('--button-text')?.trim() || '#111827';
                        const ratio = Math.round(contrastRatio(brand60, text)*100)/100;
                        return `${ratio}:1`;
                      })()}</div>
                      <div className='ml-2 text-sm'>
                        {(() => {
                          const brand60 = getComputedStyle(document.documentElement).getPropertyValue('--brand-60')?.trim() || '#570082';
                          const text = getComputedStyle(document.documentElement).getPropertyValue('--button-text')?.trim() || '#111827';
                          const ratio = contrastRatio(brand60, text);
                          if (ratio >= 4.5) return <span className='text-green-600'>Good</span>;
                          if (ratio >= 3) return <span className='text-yellow-600'>Acceptable</span>;
                          return <span className='text-red-600'>Low</span>;
                        })()}
                      </div>
                    </div> */}

                    {/* Interactive demo area */}
                    <div className='mt-4 w-full p-4 rounded border border-primary'>
                      <Typography variant='subtitle1' className='mb-2'>Interactive component demo</Typography>
                      <div className='mb-2'>
                        <AppBar position='static' color='primary' elevation={0} sx={{ borderRadius: 1 }}>
                          <Toolbar variant='dense' sx={{ minHeight: 44 }}>
                            <Typography sx={{ flex: 1 }}><strong>Wkly</strong></Typography>
                            <IconButton aria-label='notifications' color='inherit'>
                              <Badge badgeContent={badgeCount} color='secondary'>
                                <span style={{ width: 18, height: 18, display: 'inline-block' }} />
                              </Badge>
                            </IconButton>
                            <Tooltip title='Profile tooltip demo'><IconButton color='inherit'><span style={{ width: 18, height: 18, display: 'inline-block' }} /></IconButton></Tooltip>
                          </Toolbar>
                        </AppBar>
                      </div>

                      <Stack direction='row' spacing={2} alignItems='center' className='mb-3'>
                        <Fab size='small' color='primary' aria-label='demo-fab'><strong>+</strong></Fab>
                        <FormControlLabel control={<Switch checked={demoSwitch} onChange={(e) => setDemoSwitch(e.target.checked)} />} label='Switch' />
                        <FormControlLabel control={<Checkbox checked={demoCheckbox} onChange={(e) => setDemoCheckbox(e.target.checked)} />} label='Checkbox' />
                        <FormControl size='small' sx={{ minWidth: 140 }}>
                          <InputLabel id='demo-select-label'>Select</InputLabel>
                          <Select labelId='demo-select-label' value={demoSelect} label='Select' onChange={(e) => setDemoSelect(e.target.value as string)}>
                            <MenuItem value='optionA'>Option A</MenuItem>
                            <MenuItem value='optionB'>Option B</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>

                      <div className='flex gap-2 items-center mb-3'>
                        <TextField label='Demo text' size='small' value={demoText} onChange={(e) => setDemoText(e.target.value)} />
                        <Button variant='contained' size='small' onClick={() => setDemoSubmitted({ badgeCount, demoSwitch, demoCheckbox, demoSelect, demoText })}>Submit Demo</Button>
                        <Button variant='outlined' size='small' onClick={() => { setBadgeCount(0); setDemoSwitch(false); setDemoCheckbox(false); setDemoSelect('optionA'); setDemoText(''); setDemoSubmitted(null); }}>Reset Demo</Button>
                      </div>

                      {demoSubmitted && (
                        <div className='mt-2 p-2 rounded'>
                          <Typography variant='body2'>Demo submitted:</Typography>
                          <pre className='font-mono text-xs p-1'>{JSON.stringify(demoSubmitted, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </Box>
                </div>
            </div>
            <div className='flex gap-4'>
                <button
                //   variant="contained"
                className="btn-secondary mt-4"
                type="button"
                onClick={() => onClose && onClose()}
                >
                Cancel
                </button>
                <button
                //   variant="contained"
                className="btn-primary mt-4"
                type="submit"
                disabled={loading}
                >
                {loading ? 'Updating...' : 'Update Profile'}
                </button>
            </div>
        </form>
    </div>
  );
};

export default ProfileManagement;