import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CONSENT_KEY = 'wkly_cookie_consent';
const CONSENT_VERSION = '1'; // bump to re-prompt after policy changes

export type ConsentValue = 'accepted' | 'declined';

/** Returns the stored consent, or null if not yet given. */
export function getConsent(): ConsentValue | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed.value as ConsentValue;
  } catch {
    return null;
  }
}

function saveConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, version: CONSENT_VERSION, at: new Date().toISOString() }));
  } catch { /* ignore */ }
}

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Small delay so the banner doesn't flash on initial render
    const timer = setTimeout(() => {
      if (getConsent() === null) setVisible(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    saveConsent('accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    saveConsent('declined');
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center px-4 pb-4 pointer-events-none"
    >
      <div className="pointer-events-auto w-full max-w-2xl rounded-xl border border-gray-20 dark:border-gray-70 bg-background-color shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary-text font-semibold mb-0.5">We use cookies &amp; local storage</p>
          <p className="text-xs text-secondary-text leading-relaxed">
            Wkly uses functional browser storage (session state, theme preference) to operate the app. We do{' '}
            <strong>not</strong> use advertising or tracking cookies.{' '}
            <button
              onClick={() => navigate('/privacy')}
              className="underline text-brand-60 dark:text-brand-30 hover:opacity-80"
            >
              Privacy Policy
            </button>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className="btn-ghost text-xs px-3 py-1.5 rounded-md text-secondary-text hover:text-primary-text transition-colors"
          >
            Decline optional
          </button>
          <button
            onClick={handleAccept}
            className="btn-primary text-xs px-4 py-1.5 rounded-md"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
