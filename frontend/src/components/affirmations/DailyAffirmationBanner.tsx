import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share2, ArrowRight, Sparkles, ThumbsUp } from 'lucide-react';
import { fetchDailyAffirmation, toggleSaveAffirmation, fetchSavedAffirmations } from '@utils/affirmationApi';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import type { Affirmation } from '../../types/affirmations';

interface DailyAffirmationBannerProps {
  /** 'interstitial' = full-screen overlay; 'inline' = compact card */
  mode: 'interstitial' | 'inline';
  /** Called when the user dismisses the interstitial */
  onDismiss?: () => void;
  /** Pre-fetched affirmation to avoid duplicate requests */
  affirmation?: Affirmation | null;
  /** Callback to share fetched affirmation with parent */
  onAffirmationLoaded?: (a: Affirmation) => void;
}

const STORAGE_KEY = 'wkly:affirmation_seen_date';

/** Returns true if the user has NOT yet seen the affirmation today. */
export function shouldShowInterstitial(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return localStorage.getItem(STORAGE_KEY) !== today;
}

/** Marks the daily affirmation as seen for today. */
export function markInterstitialSeen(): void {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(STORAGE_KEY, today);
}

const DailyAffirmationBanner: React.FC<DailyAffirmationBannerProps> = ({
  mode,
  onDismiss,
  affirmation: propAffirmation,
  onAffirmationLoaded,
}) => {
  const navigate = useNavigate();
  const [affirmation, setAffirmation] = useState<Affirmation | null>(propAffirmation ?? null);
  const [loading, setLoading] = useState(!propAffirmation);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  const load = useCallback(async () => {
    if (propAffirmation) { setLoading(false); return; }
    try {
      const [daily, saved] = await Promise.all([
        fetchDailyAffirmation(),
        fetchSavedAffirmations(),
      ]);
      setAffirmation(daily);
      onAffirmationLoaded?.(daily);
      const ids = new Set(saved.map((s) => s.affirmation?.id).filter(Boolean));
      setIsSaved(ids.has(daily.id));
    } catch {
      try {
        const daily = await fetchDailyAffirmation();
        setAffirmation(daily);
        onAffirmationLoaded?.(daily);
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }, [propAffirmation, onAffirmationLoaded]);

  useEffect(() => { load(); }, [load]);

  // Trigger entrance animation after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Sync if parent passes a new affirmation
  useEffect(() => {
    if (propAffirmation) setAffirmation(propAffirmation);
  }, [propAffirmation]);

  const handleSave = async () => {
    if (!affirmation || saving) return;
    setSaving(true);
    try {
      const action = isSaved ? 'unsave' : 'save';
      await toggleSaveAffirmation(affirmation.id, action);
      setIsSaved(!isSaved);
      notifySuccess(isSaved ? 'Removed from favorites' : 'Saved to favorites');
    } catch {
      notifyError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!affirmation) return;
    const shareText = `"${affirmation.text}"${affirmation.author ? `\n— ${affirmation.author}` : ''}\n\nSee more at Wkly -> https://wkly.me`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      notifySuccess('Copied to clipboard');
    }
  };

  const handleDismiss = () => {
    markInterstitialSeen();
    onDismiss?.();
  };

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Interstitial (full-screen overlay) ──────────────────────────────────
  if (mode === 'interstitial') {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm transition-opacity duration-700 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className={`max-w-2xl w-full mx-4 text-center transition-all duration-700 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <p className="text-xs tracking-[0.15em] uppercase text-secondary-text mb-6">
            {dateStr} — The Daily Drift
          </p>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="text-brand-40 dark:text-brand-30 text-6xl font-serif leading-none opacity-20 select-none">
                &#x201C;&#x201D;
              </div>
              <div className="h-8 bg-brand-10 dark:bg-gray-70/50 rounded w-5/6 mx-auto" />
              <div className="h-8 bg-brand-10 dark:bg-gray-70/50 rounded w-4/6 mx-auto" />
            </div>
          ) : (
            <>
              <div className="text-brand-40 dark:text-brand-30 text-6xl font-serif leading-none opacity-40 mb-6 select-none">
                &#x201C;&#x201D;
              </div>

              <blockquote className="font-serif text-3xl sm:text-4xl lg:text-5xl italic leading-snug text-primary-text mb-6">
                {affirmation?.text || 'The void awaits your arrival.'}
              </blockquote>

              {affirmation?.author && (
                <>
                  <div className="w-10 h-[1px] bg-secondary-text/30 mx-auto my-6" />
                  <p className="text-xs tracking-[0.1em] uppercase text-secondary-text">
                    — {affirmation.author}
                  </p>
                </>
              )}

              {!affirmation?.author && (
                <>
                  <div className="w-10 h-[1px] bg-secondary-text/30 mx-auto my-6" />
                  <p className="text-xs tracking-[0.1em] uppercase text-secondary-text">
                    Deep Thoughts for Shallow Moments
                  </p>
                </>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-0 shadow-none ${
                isSaved
                  ? 'bg-brand-60 dark:bg-brand-40 text-white dark:text-gray-90'
                  : 'bg-brand-10 dark:bg-gray-80 text-brand-80 dark:text-brand-20 hover:bg-brand-20 dark:hover:bg-gray-70'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'Cherished' : 'Cherish'}
            </button>
            <button
              onClick={handleShare}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-10 dark:bg-gray-80 text-brand-80 dark:text-brand-20 hover:bg-brand-20 dark:hover:bg-gray-70 transition-all duration-200 border-0 shadow-none"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>

          <button
            onClick={handleDismiss}
            className="mt-12 inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-gradient-to-br from-brand-60 to-brand-70 dark:from-brand-30 dark:to-brand-50 text-white hover:brightness-110 active:scale-95 transition-all duration-200 border-0 shadow-none"
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Inline (compact card below goals) ───────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-md border border-gray-20 dark:border-gray-70 bg-background-color p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded bg-brand-10 dark:bg-gray-70" />
          <div className="h-4 w-32 bg-brand-10 dark:bg-gray-70 rounded" />
        </div>
        <div className="h-5 bg-brand-10 dark:bg-gray-70/50 rounded w-full mb-2" />
        <div className="h-5 bg-brand-10 dark:bg-gray-70/50 rounded w-4/5" />
      </div>
    );
  }

  if (!affirmation) return null;

  return (
    <div className="rounded-md border border-gray-20 dark:border-gray-70 bg-background-color p-5 group hover:border-primary transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-secondary-text">
          <ThumbsUp className="w-4 h-4 text-brand-60 dark:text-brand-30" />
          <span className="text-xs tracking-[0.1em] uppercase">Today's Affirmation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-md hover:bg-brand-10 dark:hover:bg-gray-80 transition-colors border-0 shadow-none bg-transparent"
            title={isSaved ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-brand-60 dark:fill-brand-30 text-brand-60 dark:text-brand-30' : 'text-secondary-text'}`} />
          </button>
          <button
            onClick={handleShare}
            className="p-1.5 rounded-md hover:bg-brand-10 dark:hover:bg-gray-80 transition-colors border-0 shadow-none bg-transparent"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5 text-secondary-text" />
          </button>
        </div>
      </div>

      <blockquote className="font-serif text-base sm:text-lg italic leading-relaxed text-primary-text mb-3">
        "{affirmation.text}"
      </blockquote>

      {affirmation.author && (
        <p className="text-xs text-secondary-text mb-3">— {affirmation.author}</p>
      )}

      <button
        onClick={() => navigate('/affirmations/archive')}
        className="text-xs font-serif italic text-brand-60 dark:text-brand-30 underline underline-offset-4 decoration-brand-60/30 dark:decoration-brand-30/30 hover:decoration-brand-60 dark:hover:decoration-brand-30 transition-all duration-200 bg-transparent border-0 shadow-none p-0"
      >
        View more affirmations →
      </button>
    </div>
  );
};

export default DailyAffirmationBanner;
