import React, { useState, useEffect } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase'; // Import supabase client
import Header from '@components/Header';
import Modal from 'react-modal';
import { modalClasses, overlayClasses } from '@styles/classes';
import { notifySuccess, notifyError } from '@components/ToastyNotification'; 
// import e from 'cors';

const Login = () => {
  // const session = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordReEnter, setPasswordReEnter] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

        console.log('User signed in successfully:', data);
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
          // Check if profile already exists
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
    
          if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "not found" error
            console.error('Error checking existing profile:', fetchError.message);
            setError(fetchError.message);
            return null;
          }
    
          if (existingProfile) {
            console.log('Profile already exists for user ID:', user.id);
          } else {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: user.id, // Ensure this matches the user ID from the `auth.users` table
                username: username || null, // Insert username if provided
                full_name: fullName || null, // Insert full_name if provided
              });
    
            if (profileError) {
              console.error('Error saving user profile:', profileError.message);
              setError(profileError.message);
              return null;
            }
          }
        } else {
          console.error('User creation failed: No user ID returned.');
          setError('User creation failed. Please try again.');
          return null;
        }
    
        console.log('User registered successfully:', data);
        setError(null); // Clear any previous errors
        return data;
      } catch (err) {
        console.error('Unexpected error during registration:', err);
        setError('Unexpected error occurred.');
        return null;
      }
    };
    
    // Updated `handleRegister` to pass only 3 arguments to `createUser`
    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
    
      const result = await createUser(email, password, passwordReEnter, username, fullName);
    
      if (!result) {
        notifyError('Registration failed. Please check your input and try again.');
        return;
      }
      console.log('Registration successful:', result);
      notifySuccess('Registration successful! Please check your email for verification.');
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
        console.log('Password reset email sent successfully.');
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
    if (!isModalOpen) {
      setIsModalOpen(true);
    }
  };

    const closeModal = () => {
      setIsModalOpen(false);
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
            <form onSubmit={handleLogin} className='flex flex-col space-y-4 p-4'>
              <div>
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='bg-gray-10 dark:bg-gray-100'
                />
              </div>
              <div>
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='bg-gray-10 dark:bg-gray-100'
                />
              </div>
              <div className='flex flex-row justify-start gap-4 pt-6'>
                <button
                  type="submit"
                  className="btn-primary w-auto self-start"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={openModal}
                  className="btn-secondary w-auto self-start"
                >
                  Register
                </button>
              </div>
              <button
                type="button"
                onClick={() => handlePasswordReset(email)}
                className="btn-ghost w-auto self-start"
              >
                Forgot Password
              </button>
              
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}

          {isModalOpen && (
                  <Modal
                    isOpen={isModalOpen}
                    onRequestClose={closeModal}
                    className="fixed inset-0 flex items-center justify-center z-50"
                    overlayClassName={`${overlayClasses}`}
                    ariaHideApp={false} // Disable automatic aria-hidden management
                  >
                    <div className={`${modalClasses}`}>
                      <h2 className="text-2xl font-bold text-left mb-4">Register</h2>
                      <form onSubmit={handleRegister} className='flex flex-col space-y-4 p-4'>
                        <div>
                          <label>Email:</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className='bg-gray-10 dark:bg-gray-100 w-full'
                          />
                        </div>
                        <div>
                          <label>Password:</label>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className='bg-gray-10 dark:bg-gray-100 w-full'
                          />
                        </div>
                        <div className='pb-4'>
                          <label>Re-enter Password:</label>
                          <input
                            type="password"
                            value={passwordReEnter}
                            onChange={(e) => setPasswordReEnter(e.target.value)}
                            required
                            className='bg-gray-10 dark:bg-gray-100 w-full'
                          />
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
                          <button
                            type="submit"
                            className="btn-primary w-auto self-start"
                          >
                            Register
                          </button>
                        </div>
                      </form>
                      {error && <p style={{ color: 'red' }}>{error}</p>}
                    </div>
                  </Modal>
                )}
          </main>
        </div>
      </div>
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