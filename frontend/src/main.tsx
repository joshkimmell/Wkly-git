import React from 'react';
// Dev-only: suppress noisy react-quill findDOMNode deprecation warning in StrictMode
import '@lib/reactQuillShim';
import Modal from 'react-modal';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import '@components/components.scss';

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
  // Ignore in non-browser or test environments where document may not be available
}