import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from '@lib/supabase.ts';


import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </SessionContextProvider>
  </React.StrictMode>
);