import React, { useState, useEffect } from 'react';
import { TextField } from '@mui/material';
import Avatar from '@components/Avatar';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import supabase from '@lib/supabase';
import useAuth from '@hooks/useAuth';
// import {isMenuHidden} from './Header';

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