import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share2, BookOpen, Sparkles, Sliders } from 'lucide-react';
import { fetchDailyAffirmation, toggleSaveAffirmation, fetchSavedAffirmations } from '@utils/affirmationApi';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import type { Affirmation } from '../../types/affirmations';
import LoadingSpinner from '@components/LoadingSpinner';

const AffirmationToday: React.FC = () => {
  const navigate = useNavigate();
  const [affirmation, setAffirmation] = useState<Affirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [daily, saved] = await Promise.all([
        fetchDailyAffirmation(),
        fetchSavedAffirmations(),
      ]);
      setAffirmation(daily);
      const ids = new Set(saved.map((s) => s.affirmation?.id).filter(Boolean));
      setSavedIds(ids);
      setIsSaved(ids.has(daily.id));
    } catch {
      // GPT generation may take a moment on first call of the day — worth retrying once
      try {
        const daily = await fetchDailyAffirmation();
        setAffirmation(daily);
      } catch {
        notifyError('Failed to load today\'s affirmation');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!affirmation || saving) return;
    setSaving(true);
    try {
      const action = isSaved ? 'unsave' : 'save';
      await toggleSaveAffirmation(affirmation.id, action);
      setIsSaved(!isSaved);
      const newIds = new Set(savedIds);
      if (isSaved) newIds.delete(affirmation.id);
      else newIds.add(affirmation.id);
      setSavedIds(newIds);
      notifySuccess(isSaved ? 'Removed from favorites' : 'Saved to favorites');
    } catch {
      notifyError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!affirmation) return;
    const shareText = `"${affirmation.text}"${affirmation.author ? ` — ${affirmation.author}` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      notifySuccess('Copied to clipboard');
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner variant="mui" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Date Header */}
      <p className="text-xs tracking-[0.15em] uppercase text-secondary-text mb-2">
        {dateStr} — The Daily Drift
      </p>

      {/* Hero Quote Card */}
      <div className="relative bg-brand-0 dark:bg-gray-80/40 rounded-xl p-8 sm:p-12 mt-4 mb-8">
        {/* Decorative quote marks */}
        <div className="text-brand-40 dark:text-brand-30 text-5xl font-serif leading-none opacity-40 mb-4 select-none">
          &#x201C;&#x201D;
        </div>

        <blockquote className="font-serif text-2xl sm:text-3xl lg:text-4xl italic leading-snug text-primary-text">
          {affirmation?.text || 'The void is loading...'}
        </blockquote>

        {affirmation?.author && (
          <>
            <div className="w-8 h-[1px] bg-secondary-text/30 my-6" />
            <p className="text-xs tracking-[0.1em] uppercase text-secondary-text">
              — {affirmation.author}
            </p>
          </>
        )}

        {!affirmation?.author && (
          <>
            <div className="w-8 h-[1px] bg-secondary-text/30 my-6" />
            <p className="text-xs tracking-[0.1em] uppercase text-secondary-text text-center">
              Deep Thoughts for Shallow Moments
            </p>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-12">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-0 shadow-none ${
            isSaved
              ? 'bg-brand-60 dark:bg-brand-40 text-white dark:text-gray-90'
              : 'bg-brand-10 dark:bg-gray-80 text-brand-80 dark:text-brand-20 hover:bg-brand-20 dark:hover:bg-gray-70'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-brand-10 dark:bg-gray-80 text-brand-80 dark:text-brand-20 hover:bg-brand-20 dark:hover:bg-gray-70 transition-all duration-200 border-0 shadow-none"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* Bottom Cards - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reflect Card */}
        <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl p-6 hover:bg-brand-10/60 dark:hover:bg-gray-80/50 transition-colors duration-300">
          <BookOpen className="w-5 h-5 text-brand-60 dark:text-brand-30 mb-3" />
          <h3 className="font-serif text-base italic text-primary-text mb-1">Reflect</h3>
          <p className="text-sm text-secondary-text leading-relaxed mb-4">
            Yesterday's wisdom was about the existential dread of losing a single sock in the laundry.
          </p>
          <button
            onClick={() => navigate('/affirmations/archive')}
            className="text-sm font-serif italic text-brand-60 dark:text-brand-30 underline underline-offset-4 decoration-brand-60/30 dark:decoration-brand-30/30 hover:decoration-brand-60 dark:hover:decoration-brand-30 transition-all duration-200 bg-transparent border-0 shadow-none p-0"
          >
            Read Archive
          </button>
        </div>

        {/* Intent Card */}
        <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl p-6 hover:bg-brand-10/60 dark:hover:bg-gray-80/50 transition-colors duration-300">
          <Sparkles className="w-5 h-5 text-brand-60 dark:text-brand-30 mb-3" />
          <h3 className="font-serif text-base italic text-primary-text mb-1">Intent</h3>
          <p className="text-sm text-secondary-text leading-relaxed mb-4">
            Set your humor profile to receive more absurdity or mild existentialism.
          </p>
          <button
            onClick={() => navigate('/affirmations/settings')}
            className="text-sm font-serif italic text-brand-60 dark:text-brand-30 underline underline-offset-4 decoration-brand-60/30 dark:decoration-brand-30/30 hover:decoration-brand-60 dark:hover:decoration-brand-30 transition-all duration-200 bg-transparent border-0 shadow-none p-0"
          >
            Adjust Vibes
          </button>
        </div>

        {/* Submit CTA */}
        <div className="md:col-span-2 bg-brand-0/40 dark:bg-gray-80/20 rounded-xl p-6 flex items-center justify-between hover:bg-brand-10/40 dark:hover:bg-gray-80/40 transition-colors duration-300">
          <div>
            <h3 className="font-serif text-base italic text-primary-text mb-1">Contribute to the Void</h3>
            <p className="text-sm text-secondary-text">Share your most profound delusions with the universe.</p>
          </div>
          <button
            onClick={() => navigate('/affirmations/submit')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-br from-brand-60 to-brand-70 dark:from-brand-30 dark:to-brand-50 text-white hover:brightness-110 active:scale-95 transition-all duration-200 border-0 shadow-none whitespace-nowrap"
          >
            <Sliders className="w-4 h-4" />
            Submit Wisdom
          </button>
        </div>
      </div>
    </div>
  );
};

export default AffirmationToday;
