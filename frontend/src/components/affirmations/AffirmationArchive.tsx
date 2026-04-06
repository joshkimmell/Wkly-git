import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Share2, ChevronDown } from 'lucide-react';
import { fetchAffirmations, toggleSaveAffirmation, fetchSavedAffirmations } from '@utils/affirmationApi';
import { AFFIRMATION_CATEGORIES } from '../../types/affirmations';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import type { Affirmation } from '../../types/affirmations';
import LoadingSpinner from '@components/LoadingSpinner';

const AffirmationArchive: React.FC = () => {
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const limit = 12;

  const loadSaved = useCallback(async () => {
    try {
      const saved = await fetchSavedAffirmations();
      setSavedIds(new Set(saved.map((s) => s.affirmation?.id).filter(Boolean)));
    } catch { /* ignore */ }
  }, []);

  const loadAffirmations = useCallback(async (pageNum: number, cat: string, append = false) => {
    try {
      const data = await fetchAffirmations({
        category: cat === 'All' ? undefined : cat,
        page: pageNum,
        limit,
      });
      setAffirmations(prev => append ? [...prev, ...data.affirmations] : data.affirmations);
      setTotal(data.total);
    } catch {
      notifyError('Failed to load archive');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadAffirmations(1, category), loadSaved()]);
      setLoading(false);
    };
    init();
  }, [category, loadAffirmations, loadSaved]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    await loadAffirmations(nextPage, category, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleToggleSave = async (id: string) => {
    if (savingId) return;
    setSavingId(id);
    try {
      const action = savedIds.has(id) ? 'unsave' : 'save';
      await toggleSaveAffirmation(id, action);
      setSavedIds(prev => {
        const next = new Set(prev);
        if (action === 'unsave') next.delete(id);
        else next.add(id);
        return next;
      });
      notifySuccess(action === 'save' ? 'Saved' : 'Removed');
    } catch {
      notifyError('Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  const handleShare = async (a: Affirmation) => {
    const shareText = `"${a.text}"${a.author ? `\n— ${a.author}` : ''}\n\nSee more at Wkly -> https://wkly.me`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
      notifySuccess('Copied to clipboard');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const hasMore = affirmations.length < total;

  // Unique categories from the constants
  const categories = ['All', ...AFFIRMATION_CATEGORIES.filter((c, i, arr) => arr.indexOf(c) === i)];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner variant="mui" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl italic text-primary-text leading-tight pb-1">
          The Archive of Gentle Absurdities
        </h1>
        <p className="text-xs tracking-[0.1em] uppercase text-secondary-text">
          Chronological Reflections from the Void
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.slice(0, 8).map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-200 border-0 shadow-none ${
              category === cat
                ? 'bg-brand-60 dark:bg-brand-30 text-white dark:text-gray-90'
                : 'bg-brand-0 dark:bg-gray-80 text-secondary-text hover:bg-brand-10 dark:hover:bg-gray-70'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Affirmation Cards - Asymmetric Bento Grid */}
      {affirmations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-secondary-text font-serif italic text-lg">The void is empty... for now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {affirmations.map((a, i) => {
            const isFeatured = i === 0;
            const isWide = i % 5 === 0;
            const isNarrow = i % 7 === 2;
            const span = isFeatured
              ? 'md:col-span-8'
              : isWide
              ? 'md:col-span-7'
              : isNarrow
              ? 'md:col-span-5'
              : 'md:col-span-6';

            // Subtle rotation for visual rhythm
            const rotation = i % 3 === 1 ? 'md:rotate-[0.5deg]' : i % 3 === 2 ? 'md:-rotate-[0.5deg]' : '';

            return (
              <div
                key={a.id}
                className={`${span} group bg-brand-0/80 dark:bg-gray-80/40 rounded-xl p-6 sm:p-8 hover:bg-brand-10 dark:hover:bg-gray-80/60 transition-all duration-300 ${rotation} hover:rotate-0`}
              >
                {/* Date */}
                <p className="text-[10px] tracking-[0.12em] uppercase text-brand-60 dark:text-brand-30 mb-3">
                  {formatDate(a.featured_date || a.created_at)}
                </p>

                {/* Quote */}
                <blockquote
                  className={`font-serif italic leading-snug text-primary-text mb-4 ${
                    isFeatured ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-base sm:text-lg'
                  }`}
                >
                  &ldquo;{a.text}&rdquo;
                </blockquote>

                {/* Author */}
                {a.author && (
                  <p className="text-xs text-secondary-text mb-3">— {a.author}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleToggleSave(a.id)}
                    disabled={savingId === a.id}
                    className="p-1.5 rounded-md hover:bg-brand-10 dark:hover:bg-gray-70 transition-colors duration-150 border-0 shadow-none bg-transparent"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        savedIds.has(a.id)
                          ? 'fill-brand-60 dark:fill-brand-30 text-brand-60 dark:text-brand-30'
                          : 'text-secondary-text'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleShare(a)}
                    className="p-1.5 rounded-md hover:bg-brand-10 dark:hover:bg-gray-70 transition-colors duration-150 border-0 shadow-none bg-transparent"
                  >
                    <Share2 className="w-4 h-4 text-secondary-text" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center mt-10">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold tracking-wider uppercase bg-brand-0 dark:bg-gray-80 text-secondary-text hover:bg-brand-10 dark:hover:bg-gray-70 transition-all duration-200 border-0 shadow-none"
          >
            {loadingMore ? <LoadingSpinner variant="mui" /> : <ChevronDown className="w-4 h-4" />}
            {loadingMore ? 'Loading...' : 'Load Older Absurdities'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AffirmationArchive;
