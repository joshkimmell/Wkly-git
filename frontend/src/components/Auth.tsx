import React, { useState } from 'react';
// import useAuth from '@hooks/useAuth'; // Adjust the path if necessary
import supabase from '@lib/supabase'; // Import supabase client
// import { Auth } from '@supabase/auth-ui-react'



const Login = () => {
  // const session = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

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

    const signInUser = async (email: string, password: string) => {
      try {
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Error signing in:', error.message);
          setError(error.message);
          return null;
        }

        if (!session || !session.access_token) {
          console.error('No session or access token found.');
          setError('No session or access token found.');
          return null;
        }

        return session.access_token;
      } catch (err) {
        console.error('Unexpected error during sign-in:', err);
        setError('Unexpected error occurred.');
        return null;
      }
    };

    return (
      <div>
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
          <div>
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Login</button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
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
// import supabase from '@lib/supabase';
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