import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import supabase from '@lib/supabase';

interface UploadAvatarsProps {
  isEdit?: boolean; // Made optional
  onClick?: (event: React.MouseEvent<HTMLLabelElement>) => void; // Updated to HTMLLabelElement
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void; // Added onChange prop
  src?: string; // Added src prop for preview image
  uploading?: boolean; // show uploading indicator
  size?: 'sm' | 'lg'; // small or large avatar
}

export default function UploadAvatars({ isEdit, onClick, onChange, src, uploading, size = 'sm' }: UploadAvatarsProps) {
  const [avatarSrc, setAvatarSrc] = React.useState<string | undefined>(undefined); // internal or stored shown src
  const [storedAvatarUrl, setStoredAvatarUrl] = React.useState<string | undefined>(undefined); // persisted avatar_url from profile
  const [avatarAlt, setAvatarAlt] = React.useState<string | undefined>(undefined);
  const [initial, setInitial] = React.useState<string | undefined>(undefined);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Read the file as a data URL for preview
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarSrc(reader.result as string); // Replace the Avatar src image with the preview
      };
      reader.readAsDataURL(file);
    }
  };

  // map size prop to responsive pixel values
  // sm: small screens, md+: larger screens
  const sizeValues = size === 'lg'
    ? { xs: 120, md: 180 }
    : { xs: 32, md: 64 };

  // spinner sizes for xs and md breakpoints (we'll set size prop to md and override via sx)
  const spinnerXs = size === 'lg' ? 56 : 20;
  const spinnerMd = size === 'lg' ? 84 : 36;

  React.useEffect(() => {
    // If a preview src is provided (e.g., freshly selected file), use it immediately and skip fetching profile
    if (src) {
      // If we're in edit mode, still set the alt to indicate upload action
      if (isEdit) {
        setAvatarAlt('Upload new avatar image');
      }
      // Do not set avatarSrc here — the preview `src` prop should take precedence in rendering.
      return;
    }

    // If editing without a preview, set a clear alt text
    if (isEdit) {
      setAvatarAlt('Upload new avatar image');
      return;
    }

    // Otherwise fetch profile row and decide whether to use avatar_url or fallback to initial
    const fetchSessionAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_url, full_name, username')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        // Set alt text from profile full_name (fallback to username)
        if (profile?.full_name) {
          setAvatarAlt(profile.full_name);
        } else if (profile?.username) {
          setAvatarAlt(profile.username);
        } else {
          setAvatarAlt('User avatar');
        }

        // Keep storedAvatarUrl so we know whether the profile has a persisted avatar
        setStoredAvatarUrl(profile?.avatar_url || undefined);

        // Only set the shown avatarSrc to the stored URL when there is no preview src
        if (!src && profile?.avatar_url) {
          setAvatarSrc(profile.avatar_url);
        }

        // If there is no stored avatar in profile, set the initial (we'll only render it when storedAvatarUrl is falsy)
        if (!profile?.avatar_url) {
          if (profile?.full_name) {
            setInitial(profile.full_name[0]?.toUpperCase() || 'U');
          } else if (profile?.username) {
            setInitial(profile.username[0]?.toUpperCase() || 'U');
          } else {
            setInitial('U');
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching profile for avatar:', err);
      }
    };

    fetchSessionAndProfile();
  }, [src, isEdit]);

  // Listen for global avatar updates so all instances refresh
  React.useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent;
        const avatarUrl = ce?.detail?.avatarUrl;
        if (avatarUrl) {
          setStoredAvatarUrl(avatarUrl);
          // Only update the shown avatarSrc when there isn't an active preview prop
          if (!src) setAvatarSrc(avatarUrl);
          setInitial(undefined);
        }
      } catch (err) {
        console.warn('Error handling avatar:updated event', err);
      }
    };

    window.addEventListener('avatar:updated', handler as EventListener);
    return () => window.removeEventListener('avatar:updated', handler as EventListener);
  }, []);

  // Prefer preview `src` prop if provided; otherwise use persisted avatar_url from profile as the default,
  // finally fall back to any internal avatarSrc (e.g., a data URL from the internal handler)
  const displayedSrc = src || storedAvatarUrl || avatarSrc;

  return (
    <ButtonBase
      component="label"
      role={undefined}
      tabIndex={-1} // prevent label from tab focus
      aria-label="Avatar image"
      sx={{
        position: 'relative',
        borderRadius: '40px',
        '&:has(:focus-visible)': {
          outline: '2px solid',
          outlineOffset: '2px',
        },
      }}
      onClick={onClick} // Updated to use the correct type
    >
      <Avatar
        alt={avatarAlt}
        src={displayedSrc}
        sx={{
          opacity: uploading ? 0.45 : 1,
          width: { xs: sizeValues.xs, md: sizeValues.md },
          height: { xs: sizeValues.xs, md: sizeValues.md },
          // Use the theme var that maps to $brand-70 (primary-button) with a fallback hex
          bgcolor: 'var(--brand-30, #c300dc)',
          border: '2px solid var(--brand-20, #E737FE)',
        }}
      >
        {/* show initial ONLY when there is no avatar_url on the profile (storedAvatarUrl)
            and there is no active preview (src prop or a data: URL set in avatarSrc) */}
        {!storedAvatarUrl && !src && !(avatarSrc?.startsWith?.('data:')) && (initial || 'U')}
      </Avatar>

      {uploading && (
        <CircularProgress
          thickness={4}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'transparent',
            borderRadius: '50%',
            width: { xs: spinnerXs, md: spinnerMd },
            height: { xs: spinnerXs, md: spinnerMd },
            '& .MuiCircularProgress-svg': {
              width: '100% !important',
              height: '100% !important',
            },
          }}
        />
      )}

      <input
        type="file"
        accept="image/*"
        style={{
          border: 0,
          clip: 'rect(0 0 0 0)',
          height: '1px',
          margin: '-1px',
          overflow: 'hidden',
          padding: 0,
          position: 'absolute',
          whiteSpace: 'nowrap',
          width: '1px',
        }}
        onChange={(event) => {
          if (onChange) {
            onChange(event); // Use the external onChange handler if provided
          } else if (isEdit) {
            handleAvatarChange(event); // Fallback to internal handler
          }
        }}
        disabled={!isEdit || !!onClick} // Disable input if isEdit is false or onClick is provided
      />
    </ButtonBase>
  );
}
