// import { SessionContextProvider } from '@supabase/auth-helpers-react';
// import supabase from '@lib/supabase.ts';
// import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import '@components/components.scss';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
  // </React.StrictMode>
);