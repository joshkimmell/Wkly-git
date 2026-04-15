import React from 'react';
// Dev-only: suppress noisy react-quill findDOMNode deprecation warning in StrictMode
import '@lib/reactQuillShim';

// Capacitor native build — rewrite relative API paths to the production Netlify URL.
// VITE_API_BASE_URL is set at build time only for native (Capacitor) builds; it is left
// unset for standard web deployments so this code path is never reached.
const _nativeApiBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
if (_nativeApiBase) {
  const _originalFetch = window.fetch.bind(window);
  // Normalise a relative URL string into an absolute Netlify Functions URL:
  //   /.netlify/functions/X  →  https://site.netlify.app/.netlify/functions/X
  //   /api/X?params          →  https://site.netlify.app/.netlify/functions/X?params
  // Calling functions directly (not via the /api/* rewrite) ensures Netlify's
  // [[headers]] CORS rule for /.netlify/functions/* fires on every response.
  const _rewrite = (url: string): string => {
    if (url.startsWith('/.netlify/')) return _nativeApiBase + url;
    if (url.startsWith('/api/')) return _nativeApiBase + '/.netlify/functions/' + url.slice('/api/'.length);
    return url;
  };
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === 'string') {
      input = _rewrite(input);
    } else if (input instanceof Request && (input.url.startsWith('/.netlify/') || input.url.startsWith('/api/'))) {
      input = new Request(_rewrite(input.url), input);
    }
    return _originalFetch(input, init);
  }) as typeof fetch;
}
import Modal from 'react-modal';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import '@components/components.scss';

// Dev-only: log a redacted OpenAI key to ensure we're using the most recent VITE variable
// DEV key redacted logging removed for clean production output

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
  </React.StrictMode> 
);

// Configure react-modal app element once. This avoids calling setAppElement in multiple components
// which can cause "Cannot register modal instance that's already open" errors in StrictMode.
try {
  Modal.setAppElement('#root');
} catch (e) {
  void e; // Silence unused variable warning
}