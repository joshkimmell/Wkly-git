import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Share2 } from 'lucide-react';
import { fetchSavedAffirmations, toggleSaveAffirmation } from '@utils/affirmationApi';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import type { SavedAffirmation } from '../../types/affirmations';
import LoadingSpinner from '@components/LoadingSpinner';

const AffirmationSaved: React.FC = () => {
  const [saved, setSaved] = useState<SavedAffirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchSavedAffirmations();
      setSaved(data);
    } catch {
      notifyError('Failed to load saved affirmations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (affirmationId: string) => {
    if (removingId) return;
    setRemovingId(affirmationId);
    try {
      await toggleSaveAffirmation(affirmationId, 'unsave');
      setSaved((prev) => prev.filter((s) => s.affirmation?.id !== affirmationId));
      notifySuccess('Removed from favorites');
    } catch {
      notifyError('Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  const handleShare = async (s: SavedAffirmation) => {
    const a = s.affirmation;
    if (!a) return;
    const shareText = `"${a.text}"${a.author ? `\n— ${a.author}` : ''}\n\nSee more at Wkly -> https://wkly.me`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      notifySuccess('Copied to clipboard');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Subtle background tint cycle for visual variety
  const tints = [
    'bg-brand-0/60 dark:bg-gray-80/30',
    'bg-brand-0/40 dark:bg-gray-80/20',
    'bg-brand-10/40 dark:bg-gray-80/40',
    'bg-brand-0/50 dark:bg-gray-80/25',
    'bg-brand-10/30 dark:bg-gray-80/35',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner variant="mui" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.1em] uppercase text-secondary-text mb-1">
          Archive of Your Existential Comfort
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl italic text-primary-text leading-tight pb-1">
          Curated Absurdities
        </h1>
        <p className="text-xs tracking-[0.08em] uppercase text-secondary-text mt-1">
          A Collection of Your Most Valued Delusions
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4 opacity-40">&#x1F9D8;</div>
          <p className="font-serif italic text-lg text-secondary-text mb-2">
            Your collection is empty.
          </p>
          <p className="text-sm text-secondary-text">
            Save affirmations from the daily feed or archive to build your personal void.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {saved.map((s, i) => {
            const a = s.affirmation;
            if (!a) return null;
            const tint = tints[i % tints.length];
            // Asymmetric card sizing
            const isLarge = i === 0 || i % 5 === 0;

            return (
              <div
                key={s.id}
                className={`${isLarge ? 'md:col-span-2' : ''} ${tint} rounded-xl p-6 sm:p-8 group transition-colors duration-300 hover:bg-brand-10/60 dark:hover:bg-gray-80/50`}
              >
                {/* Decorative quote mark for large cards */}
                {isLarge && (
                  <div className="text-brand-40/20 dark:text-brand-30/20 text-4xl font-serif leading-none mb-2 select-none">
                    &#x201C;&#x201D;
                  </div>
                )}

                <blockquote
                  className={`font-serif italic leading-snug text-primary-text mb-4 ${
                    isLarge ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
                  }`}
                >
                  &ldquo;{a.text}&rdquo;
                </blockquote>

                {a.author && (
                  <p className="text-xs text-secondary-text mb-2">— {a.author}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-col gap-0.5">
                    {a.category && (
                      <p className="text-[10px] tracking-[0.1em] uppercase text-secondary-text/60">
                        {a.category}
                      </p>
                    )}
                    <p className="text-[10px] text-secondary-text/50">
                      Saved {formatDate(s.saved_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleShare(s)}
                      className="p-1.5 rounded-md hover:bg-brand-0 dark:hover:bg-gray-70 transition-colors duration-150 opacity-0 group-hover:opacity-100 border-0 shadow-none bg-transparent"
                    >
                      <Share2 className="w-4 h-4 text-secondary-text" />
                    </button>
                    <button
                      onClick={() => handleRemove(a.id)}
                      disabled={removingId === a.id}
                      className="p-1.5 rounded-md hover:bg-brand-0 dark:hover:bg-gray-70 transition-colors duration-150 border-0 shadow-none bg-transparent"
                    >
                      <Heart className="w-4 h-4 fill-brand-60 dark:fill-brand-30 text-brand-60 dark:text-brand-30" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {saved.length > 0 && (
        <div className="text-center mt-10">
          <p className="text-xs tracking-[0.1em] uppercase text-secondary-text/50">
            End of your curated absurdities.
          </p>
        </div>
      )}
    </div>
  );
};

export default AffirmationSaved;
