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
import { ArrowRight, Award, CheckSquare, Eye, EyeOff, LayoutGrid, Sparkles } from 'lucide-react';
import ToastNotification, { notifySuccess, notifyError } from '@components/ToastyNotification'; 
import { sendPasswordReset } from '@lib/authHelpers';
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
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: 'https://wkly.me' },
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
      // Supabase sends the confirmation email directly via custom SMTP (Mailgun).
      // No secondary send needed here.
      // Show a confirmation notice instructing the user to confirm their email.
      setIsRegisterModalOpen(false);
      setShowConfirmNotice(true);
    };

    const handlePasswordReset = async (email: string) => {
      try {
        const { error } = await sendPasswordReset(email)

        if (error) {
          notifyError(`${error.message}`)
          console.error('Error sending password reset email:', error.message)
          setError(error.message)
          return
        }

        notifySuccess('Password reset email has been sent successfully. Please check your inbox.')
        setError(null)
      } catch (err: any) {
        console.error('Unexpected error during password reset:', err)
        setError(err?.message || 'Unexpected error occurred.')
      }
    }

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

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'theme-dark' ? 'theme-light' : 'theme-dark';
    if (next === 'theme-dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('theme', next); } catch {}
    return next;
  });
  
  useEffect(() => {
    if (theme === 'theme-dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);
  
    return (
    <SessionContextProvider supabaseClient={supabase}>
      <AppMuiThemeProvider mode={theme}>
      <div className={`${theme}`}>
        <div className={`min-h-screen bg-background text-primary-text`}>
          <Header   
            theme={theme}
            toggleTheme={toggleTheme}
          />
          <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16 py-12 lg:py-20">
            <div className="flex flex-col items-center">

              {/* ── Hero / value prop ── */}
              <div className="flex flex-col gap-6">
                
                <div className='relative text-start z-10 max-w-7xl'>
                  <h1 className="text-4xl sm:text-5xl font-light leading-tight mb-3">
                    Welcome to{' '}
                    <span style={{ color: 'var(--primary)' }}>Wkly</span>
                  </h1>
                  <p className="text-lg mb-8" style={{ color: 'var(--secondary-text, currentColor)', opacity: 0.8 }}>
                    Your weekly command center for goals, tasks, and progress — all in one place.
                  </p>

                  {/* feature pills */}
                  <div className="grid grid-cols-2 gap-3 w-full min-h-[20rem] mb-10 ">
                    {[
                      { icon: <LayoutGrid className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />,   label: 'Prioritized goals', desc: 'Set focused goals each week' },
                      { icon: <CheckSquare className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />, label: 'Task tracking', desc: 'Break goals into tasks' },
                      { icon: <Award className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />,   label: 'Accomplishments', desc: 'Capture what you achieved' },
                      { icon: <Sparkles className="w-8 h-8 lg:w-[10rem] lg:h-[10rem]" />, label: 'AI summaries', desc: 'Auto-generate progress reports' },
                    ].map(({ icon, label, desc }) => (
                      <div
                        key={label}
                        className="flex flex-col items-start gap-1 rounded-md bg-background-color border border-brand-20 dark:border-brand-70 p-3 sm:p-8 text-left"
                      >
                        <div className="flex items-start gap-3 text-brand-50 font-normal text-lg md:text-2xl">
                          {icon}
                          <div className="flex flex-col">
                            {label}
                            <p className="text-sm text-gray-50 dark:text-gray-40">{desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-0 flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={openModal}
                    className="btn-primary px-8 py-3 text-3xl font-[400]"
                  >
                    Get started free
                  <ArrowRight className="w-8 h-8 ml-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="btn-ghost px-8 py-3 text-base font-[400] hover:underline"
                  >
                    Already registered? Login
                  </button>
                  
                </div>
              </div>

          </div>{/* end grid */}
          </main>

          {/* Login modal */}
          <Modal
            isOpen={isLoginModalOpen}
            onRequestClose={() => { setIsLoginModalOpen(false); setError(null); setLoginErrors({}); }}
            shouldCloseOnOverlayClick={true}
            className={`${modalClasses} w-full max-w-sm mx-4`}
            overlayClassName={`${overlayClasses} flex items-center justify-center`}
            ariaHideApp={ARIA_HIDE_APP}
          >
              <h2 className="text-2xl font-bold mb-4">Login</h2>
              <form onSubmit={async (e) => { await handleLogin(e); }} className="flex flex-col gap-4">
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
                  sx={{ mb: 1, '& .MuiOutlinedInput-root': { backgroundColor: fieldBg, borderRadius: radius }, '& .MuiOutlinedInput-notchedOutline': { borderColor: dividerColor } }}
                />
                <TextField
                  id="login-password-modal"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginErrors((s) => ({ ...s, password: undefined })); }}
                  required
                  fullWidth
                  size="small"
                  error={!!loginErrors.password}
                  helperText={loginErrors.password}
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
                {error && <p className="text-sm" style={{ color: 'red' }}>{error}</p>}
                <Button type="submit" variant="contained" className="" size="large" fullWidth>
                  Login
                </Button>
                <div className="flex flex-row justify-between items-center pt-1">
                  <Button
                    variant="text"
                    className="btn-ghost text-brand-70 dark:text-brand-40"
                    onClick={() => handlePasswordReset(email)}
                    sx={{ py: 0.8 }}
                  >
                    Forgot Password
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => { setIsLoginModalOpen(false); openModal(); }}
                    sx={{ py: 0.8, px: 2, borderRadius: radius }}
                  >
                    Register
                  </Button>
                </div>
              </form>
          </Modal>

          {/* Register modal */}
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
                              sx={{ py: 1.2, px: 3, color: muiTheme.palette.text.primary, '&:hover': { opacity: 0.95 } }}
                              className='btn-primary'
                            >
                              Register
                            </Button>
                          </div>
                        </div>
                      </form>
                      
                    </div>
                  </Modal>
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