import React, { useState, useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase'; // Import supabase client
import Header from '@components/Header';
import Modal from 'react-modal';
import { TextField, Button, IconButton, Paper } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import AppMuiThemeProvider from '../mui/muiTheme';
// import appColors from '@styles/appColors';
import { ARIA_HIDE_APP } from '@lib/modal';
import { modalClasses, overlayClasses } from '@styles/classes';
import { Eye, EyeOff } from 'lucide-react';
import ToastNotification, { notifySuccess, notifyError } from '@components/ToastyNotification'; 
// import e from 'cors';

const Login = () => {
  // const session = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordReEnter, setPasswordReEnter] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Field-level validation state
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [registerErrors, setRegisterErrors] = useState<{ email?: string; password?: string; passwordReEnter?: string }>({});
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [showConfirmNotice, setShowConfirmNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordReEnter, setShowPasswordReEnter] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();

      // Basic client-side validation
  const newLoginErrors: typeof loginErrors = {};
  if (!email) newLoginErrors.email = 'Email is required';
  else if (!isValidEmail(email)) newLoginErrors.email = 'Invalid email format';
  if (!password) newLoginErrors.password = 'Password is required';
      setLoginErrors(newLoginErrors);
      if (Object.keys(newLoginErrors).length > 0) return;

      const accessToken = await signInUser(email, password);

      if (!accessToken) {
        setError('Failed to log in. Please check your credentials.');
        return;
      }

      // console.log('User logged in successfully. Access Token:', accessToken);
      setError(null); // Clear any previous errors
      // You can now use the access token for authenticated requests
    };

    // Removed unused `password_reset` parameter from the `signInUser` function
    const signInUser = async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Error signing in:', error.message);
          setError(error.message);
          return null;
        }

        // console.log('User signed in successfully:', data);
        setError(null); // Clear any previous errors
        return data;
      } catch (err) {
        console.error('Unexpected error during sign-in:', err);
        setError('Unexpected error occurred.');
        return null;
      }
    };

    const createUser = async (email: string, password: string, passwordReEnter: string, username: string, fullName: string) => {
      if (password !== passwordReEnter) {
        setError('Passwords do not match. Please re-enter your password.');
        setRegisterErrors((prev) => ({ ...prev, passwordReEnter: 'Passwords do not match' }));
        return null;
      }
    
      try {
          // Ask Supabase to include a redirect in the confirmation email.
          // Use the public production host (wkly.me) so the user lands on the real site
          // after confirming their email. We include both commonly-accepted option
          // keys to be compatible with different client versions.
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
    
        if (error) {
          console.error('Error registering user:', error.message);
          setError(error.message);
          return null;
        }
    
        const { user } = data;
    
        if (user && user.id) {
          try {
            // Only attempt to write to the `profiles` table if there's an active
            // authenticated session. On some Supabase setups (email confirm required)
            // signUp does not create a session immediately, and client-side inserts
            // will fail due to RLS (no auth JWT).
            const { data: sessionData } = await supabase.auth.getSession();
            const session = (sessionData as any)?.session;
            if (!session) {
              // console.log('No active session after signUp; deferring profile creation until first sign-in or handled server-side.');
              // Informational only: do not treat as an error. Profile creation should
              // be performed after the user signs in (or via a secure server-side endpoint).
            } else {
              // Check if profile already exists
              const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('id', { head: false, count: 'exact' })
                .eq('id', user.id)
                .single();

              if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "not found" error
                console.error('Error checking existing profile:', fetchError.message);
                setError(fetchError.message);
                return null;
              }

              if (existingProfile) {
                // console.log('Profile already exists for user ID:', user.id);
              } else {
                const { error: profileError } = await supabase
                  .from('profiles')
                  .insert({
                    id: user.id, // Ensure this matches the user ID from the `auth.users` table
                    username: username || null, // Optional field
                    full_name: fullName || null, // Optional field
                  });

                if (profileError) {
                  console.error('Error saving user profile:', profileError.message);
                  setError(profileError.message);
                  return null;
                }
              }
            }
          } catch (err) {
            console.error('Unexpected error during profile creation:', err);
            setError('Unexpected error occurred while creating profile.');
            return null;
          }
        } else {
          console.error('User creation failed: No user ID returned.');
          setError('User creation failed. Please try again.');
          return null;
        }
    
        // console.log('User registered successfully:', data);
        setError(null); // Clear any previous errors
        return data;
      } catch (err) {
        console.error('Unexpected error during registration:', err);
        setError('Unexpected error occurred.');
        return null;
      }
    };
    
    // Updated `handleRegister` to pass only 3 arguments to `createUser`
    const passwordsMatch = password && passwordReEnter && password === passwordReEnter;

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
    
      // Basic client-side validation
      const newRegErrors: typeof registerErrors = {};
      if (!email) newRegErrors.email = 'Email is required';
      if (!password) newRegErrors.password = 'Password is required';
      if (!passwordReEnter) newRegErrors.passwordReEnter = 'Please re-enter password';
      if (password && passwordReEnter && password !== passwordReEnter) newRegErrors.passwordReEnter = 'Passwords do not match';
      setRegisterErrors(newRegErrors);
      if (Object.keys(newRegErrors).length > 0) return;

      const result = await createUser(email, password, passwordReEnter, username, fullName);
    
      if (!result) {
        notifyError('Registration failed. Please check your input and try again.');
        return;
      }
      // console.log('Registration successful:', result);
      // Show a confirmation notice instructing the user to confirm their email.
      setIsRegisterModalOpen(false);
      setShowConfirmNotice(true);
    };

    const handlePasswordReset = async (email: string) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
    
        if (error) {
          notifyError(`${error.message}`);
          console.error('Error sending password reset email:', error.message);
          setError(error.message);
          return;
        }
        
        notifySuccess('Password reset email has been sent successfully. Please check your inbox.');
        // console.log('Password reset email sent successfully.');
        setError(null); // Clear any previous errors
      } catch (err) {
        console.error('Unexpected error during password reset:', err);
        setError('Unexpected error occurred.');
      }
    };

    const [theme, setTheme] = useState<'theme-dark' | 'theme-light'>(
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'theme-dark' : 'theme-light'
    );
  const muiTheme = useMuiTheme();
  const primaryColor = muiTheme?.palette?.primary?.main || 'var(--wkly-btn-primary)';
  const textOnColor = muiTheme?.palette?.text?.primary || 'var(--wkly-text-on-color)';
  const fieldBg = muiTheme?.palette?.background?.paper || 'var(--wkly-background)';
  const dividerColor = muiTheme?.palette?.divider || 'var(--wkly-divider)';
  const radius = (muiTheme as any)?.shape?.borderRadius ? `${(muiTheme as any).shape.borderRadius}px` : 'var(--wkly-radius)';

    const openModal = () => {
    if (!isRegisterModalOpen) {
      setIsRegisterModalOpen(true);
    }
  };

  // Basic email format validation (simple RFC2822-ish regex)
  const isValidEmail = (value: string) => {
    if (!value) return false;
    const re = /^(?:[a-zA-Z0-9_'^&+\/=`{|}~.-])+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    return re.test(value);
  };

    const closeModal = () => {
      setIsRegisterModalOpen(false);
    };

  const toggleTheme = () => setTheme(prev => (prev === 'theme-dark' ? 'theme-light' : 'theme-dark'));
  
  useEffect(() => {
    if (theme === 'theme-dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);
  
    return (
    <SessionContextProvider supabaseClient={supabase}>
      <AppMuiThemeProvider mode={theme}>
      <div className={`${theme}`}>
        <div className={`min-h-screen bg-gray-10 dark:bg-gray-90 text-gray-90 dark:text-gray-10`}>
          <Header   
            theme={theme}
            toggleTheme={toggleTheme}
          />
          <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
            <h1 className="text-3xl text-left mb-4">Login</h1>
            <form onSubmit={handleLogin} className='flex flex-col gap-4 space-y-4 p-4'>
              <div className="w-full">
                <TextField
                  id="login-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoginErrors((s) => ({ ...s, email: undefined })); }}
                  onBlur={() => {
                    if (!email) setLoginErrors((s) => ({ ...s, email: 'Email is required' }));
                    else if (!isValidEmail(email)) setLoginErrors((s) => ({ ...s, email: 'Invalid email format' }));
                    else setLoginErrors((s) => ({ ...s, email: undefined }));
                  }}
                  required
                  fullWidth
                  size="small"
                  error={!!loginErrors.email}
                  helperText={loginErrors.email}
                   // variant="outlined"
                  sx={{ mb: 1 }}
                />
              </div>
              <div>
                <TextField
                  id="login-password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginErrors((s) => ({ ...s, password: undefined })); }}
                  required
                  fullWidth
                  size="small"
                  error={!!loginErrors.password}
                  helperText={loginErrors.password}
                   // variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        size="small"
                        className="btn-ghost"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </IconButton>
                    ),
                  }}
                  sx={{ mb: 1, '& .MuiOutlinedInput-root': { backgroundColor: fieldBg, borderRadius: radius }, '& .MuiOutlinedInput-notchedOutline': { borderColor: dividerColor } }}
                />
              </div>
              <Button type="submit" variant="contained" className='btn-primary' size="large" >
                Login
              </Button>
              <div className='flex flex-row justify-start gap-4 pt-6'>
                <Button variant="outlined" onClick={openModal} sx={{ py: 0.8, px: 3, borderRadius: radius }}>
                  Register
                </Button>
                <Button variant="text" onClick={() => handlePasswordReset(email)} sx={{ py: 0.8 }}>
                  Forgot Password
                </Button>
              </div>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}

          <Modal
            isOpen={isRegisterModalOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center z-50"
            overlayClassName={`${overlayClasses}`}
            ariaHideApp={ARIA_HIDE_APP}
          >
                    <div className={`${modalClasses}`}>
                      <h2 className="text-2xl text-left mb-4">Register</h2>
                      <form onSubmit={handleRegister} className='flex flex-col space-y-4 p-4'>
                        <TextField
                          id="register-email"
                          label="Email"
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setRegisterErrors((s) => ({ ...s, email: undefined })); }}
                          onBlur={() => {
                            if (!email) setRegisterErrors((s) => ({ ...s, email: 'Email is required' }));
                            else if (!isValidEmail(email)) setRegisterErrors((s) => ({ ...s, email: 'Invalid email format' }));
                            else setRegisterErrors((s) => ({ ...s, email: undefined }));
                          }}
                          required
                          fullWidth
                          size="small"
                          error={!!registerErrors.email}
                          helperText={registerErrors.email || ''}
                          //  // variant="outlined"
                          sx={{ mb: 1, '& .MuiOutlinedInput-root': { backgroundColor: fieldBg, borderRadius: radius }, '& .MuiOutlinedInput-notchedOutline': { borderColor: dividerColor } }}
                        />
                        <TextField
                          id="register-password"
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setRegisterErrors((s) => ({ ...s, password: undefined })); }}
                          required
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
                          label="Re-enter Password"
                          type={showPasswordReEnter ? 'text' : 'password'}
                          value={passwordReEnter}
                          onChange={(e) => { setPasswordReEnter(e.target.value); setRegisterErrors((s) => ({ ...s, passwordReEnter: undefined })); }}
                          required
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
                        {/* {!passwordsMatch && passwordReEnter && (
                          <div className='text-sm text-red-500 mb-2'>Passwords do not match.</div>
                        )} */}
                        <Paper elevation={1} className="border-b border-gray-20 dark:border-gray-80 p-6 bg-gray-20 dark:bg-gray-100 mb-4">

                          <TextField
                            id="register-username"
                            label="Username (Optional)"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            fullWidth
                            size="small"
                             // variant="outlined"
                            sx={{ mb: 1, '& .MuiOutlinedInput-root': { backgroundColor: fieldBg, borderRadius: radius }, '& .MuiOutlinedInput-notchedOutline': { borderColor: dividerColor } }}
                          />
                        
                          <TextField
                            id="register-fullname"
                            label="Full Name (Optional)"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            fullWidth
                            size="small"
                            sx={{ mb: 1 }}
                          />
                        </Paper>
                        
                        <div className='flex flex-row justify-end gap-4 pt-6'>
                          <Button type="button"  variant="outlined" onClick={closeModal} sx={{ py: 0.8, px: 3, borderRadius: radius, color: muiTheme.palette.text.primary }}>
                            Cancel
                          </Button>
                          <div className='flex flex-col items-end'>
                            
                            <Button
                              type="submit"
                              variant="contained"
                              disabled={!email || !password || !passwordReEnter || !passwordsMatch}
                              sx={{ py: 1.2, px: 3, backgroundColor: primaryColor, color: textOnColor, '&:hover': { opacity: 0.95 } }}
                            >
                              Register
                            </Button>
                          </div>
                        </div>
                      </form>
                      
                    </div>
                  </Modal>
          </main>
        </div>
      </div>
      <Modal
        isOpen={showConfirmNotice}
        onRequestClose={() => setShowConfirmNotice(false)}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName={`${overlayClasses}`}
        ariaHideApp={ARIA_HIDE_APP}
      >
        <div className={`${modalClasses}`}>
          <h3 className="text-lg font-medium">Thanks for registering!</h3>
          <p className="mt-2 text-gray-90 dark:text-gray-10">Confirm your email address to continue.</p>
          <div className="mt-4 flex justify-end">
            <Button variant="contained" onClick={() => setShowConfirmNotice(false)} sx={{ py: 1, px: 3 }}>Okay</Button>
          </div>
        </div>
      </Modal>
      <ToastNotification theme={theme} />
      </AppMuiThemeProvider>
    </SessionContextProvider>
    );
  
};

export default Login;