import React, { useState, useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase'; // Import supabase client
import Header from '@components/Header';
import Modal from 'react-modal';
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
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [showConfirmNotice, setShowConfirmNotice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordReEnter, setShowPasswordReEnter] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();

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

    const openModal = () => {
    if (!isRegisterModalOpen) {
      setIsRegisterModalOpen(true);
    }
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
      <div className={`${theme}`}>
        <div className={`min-h-screen bg-gray-10 dark:bg-gray-90 text-gray-90 dark:text-gray-10`}>
          <Header   
            theme={theme}
            toggleTheme={toggleTheme}
          />
          <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
            <h1 className="text-3xl font-bold text-left mb-4">Login</h1>
            <form onSubmit={handleLogin} className='flex flex-col gap-4 space-y-4 p-4'>
              <div className="w-full">
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='w-full bg-gray-10 dark:bg-gray-100'
                />
              </div>
              <div>
                <label>Password:</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className='bg-gray-10 dark:bg-gray-100 w-full pr-12'
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-ghost text-sm"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary text-lg w-auto self-start px-8"
              >
                Login
              </button>
              <div className='flex flex-row justify-start gap-4 pt-6'>
                <button
                  type="button"
                  onClick={openModal}
                  className="btn-secondary w-auto self-start"
                >
                  Register
                </button>
              <button
                type="button"
                onClick={() => handlePasswordReset(email)}
                className="btn-ghost w-auto"
              >
                Forgot Password
              </button>
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
                      <h2 className="text-2xl font-bold text-left mb-4">Register</h2>
                      <form onSubmit={handleRegister} className='flex flex-col space-y-4 p-4'>
                        <div className='relative w-full'>
                          <label>Email:</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className='bg-gray-10 dark:bg-gray-100 w-full pr-12'
                          />
                        </div>
                        <div>
                          <label>Password:</label>
                          <div className="relative w-full">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className='bg-gray-10 dark:bg-gray-100 w-full pr-12'
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((s) => !s)}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-ghost text-sm"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className='pb-4'>
                          <label>Re-enter Password:</label>
                          <div className="relative w-full">
                            <input
                              type={showPasswordReEnter ? 'text' : 'password'}
                              value={passwordReEnter}
                              onChange={(e) => setPasswordReEnter(e.target.value)}
                              required
                              className='bg-gray-10 dark:bg-gray-100 w-full pr-12'
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswordReEnter((s) => !s)}
                              aria-label={showPasswordReEnter ? 'Hide re-entered password' : 'Show re-entered password'}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-ghost text-sm"
                            >
                              {showPasswordReEnter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="border-t pt-6 border-gray-20 dark:border-gray-70 mb-4"> 
                          <label>Username (Optional):</label>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            // required
                            className='bg-gray-10 dark:bg-gray-100 w-full'
                          />
                        </div>
                        <div>
                          <label>Full Name (Optional):</label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            // required
                            className='bg-gray-10 dark:bg-gray-100 w-full'
                          />
                        </div>
                        <div className='flex flex-row justify-end gap-4 pt-6'>
                          <button
                            type="button"
                            onClick={closeModal}
                            className="btn-secondary w-auto self-start"
                          >
                            Cancel  
                          </button>
                          <div className='flex flex-col items-end'>
                            {!passwordsMatch && passwordReEnter && (
                              <div className='text-sm text-red-500 mb-2'>Passwords do not match.</div>
                            )}
                            <button
                              type="submit"
                              className="btn-primary w-auto self-start"
                              disabled={!email || !password || !passwordReEnter || !passwordsMatch}
                            >
                              Register
                            </button>
                          </div>
                        </div>
                      </form>
                      {error && <p style={{ color: 'red' }}>{error}</p>}
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
            <button className="btn-primary" onClick={() => setShowConfirmNotice(false)}>Okay</button>
          </div>
        </div>
      </Modal>
      <ToastNotification theme={theme} />
    </SessionContextProvider>
    );
    
  //  const handleSignIn = async () => {
  //       await supabase.auth.signInWithOAuth({
  //         provider: 'google',
  //         options: {
  //           redirectTo: 'http://localhost:5173/',
  //         },
  //       });
  //     };

  //    const handleSignOut = async () => {
  //         await supabase.auth.signOut();
  //    }


  // return (
  //   <div>
  //     {session ? (
  //       <div>
  //         <p>Logged in as: {session.user?.email}</p>
  //         <button onClick={handleSignOut}>Sign Out</button>
  //       </div>
  //     ) : (
  //       <div>
  //         <p>You are not logged in.</p>
  //         <button onClick={handleSignIn}>Sign In with Google</button>
  //       </div>
  //     )}
  //   </div>
  // );
};

export default Login;


// export default AuthComponent;

// import React, { useState } from 'react';
// import supabase from '../../frontend/src/lib/supabase';
// // import { useAuth  } from '@hooks';

// const Login = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState<string | null>(null);

//   const handleLogin = async (e: React.FormEvent) => {
//     e.preventDefault();

//     const accessToken = await signInUser(email, password);

//     if (!accessToken) {
//       setError('Failed to log in. Please check your credentials.');
//       return;
//     }

//     console.log('User logged in successfully. Access Token:', accessToken);
//     setError(null); // Clear any previous errors
//     // You can now use the access token for authenticated requests
//   };

//   const signInUser = async (email: string, password: string) => {
//     try {
//       const { data: { session }, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       });

//       if (error) {
//         console.error('Error signing in:', error.message);
//         setError(error.message);
//         return null;
//       }

//       if (!session || !session.access_token) {
//         console.error('No session or access token found.');
//         setError('No session or access token found.');
//         return null;
//       }

//       return session.access_token;
//     } catch (err) {
//       console.error('Unexpected error during sign-in:', err);
//       setError('Unexpected error occurred.');
//       return null;
//     }
//   };

//   return (
//     <div>
//       <h1>Login</h1>
//       <form onSubmit={handleLogin}>
//         <div>
//           <label>Email:</label>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//           />
//         </div>
//         <div>
//           <label>Password:</label>
//           <input
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//           />
//         </div>
//         <button type="submit">Login</button>
//       </form>
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//     </div>
//   );
// };

// export default Login;