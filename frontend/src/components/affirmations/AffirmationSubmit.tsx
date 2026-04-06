import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { submitAffirmation } from '@utils/affirmationApi';
import { AFFIRMATION_CATEGORIES } from '../../types/affirmations';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import { Switch } from '@mui/material';
import RichTextEditor from '@components/RichTextEditor';

const MAX_CHARS = 280;

const AffirmationSubmit: React.FC = () => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('General');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    if (text.trim().length > 500) {
      notifyError('Please keep it under 500 characters');
      return;
    }
    setSubmitting(true);
    try {
      await submitAffirmation({ text: text.trim(), category, is_anonymous: isAnonymous });
      notifySuccess('Your wisdom has been released into the void');
      setSubmitted(true);
    } catch (err: any) {
      notifyError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setText('');
    setCategory('General');
    setIsAnonymous(false);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-5xl mb-6 opacity-60">&#x2728;</div>
        <h2 className="font-serif text-2xl italic text-primary-text mb-3">
          Your wisdom has been absorbed.
        </h2>
        <p className="text-secondary-text mb-8">
          It will be reviewed by our Chief Absurdist and, if deemed sufficiently pointless, shared with the collective.
        </p>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-gradient-to-br from-brand-60 to-brand-70 dark:from-brand-30 dark:to-brand-50 text-white hover:brightness-110 active:scale-95 transition-all duration-200 border-0 shadow-none"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.15em] uppercase text-brand-60 dark:text-brand-30 mb-2">
          Editorial Department
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl italic text-primary-text leading-tight pb-1">
          Contribute to the Void
        </h1>
        <p className="text-secondary-text text-sm mt-2">
          Share your most profound delusions with the universe. We promise to judge them fairly.
        </p>
      </div>

      {/* Text Input */}
      <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl p-6 sm:p-8 mb-4">
        <RichTextEditor
          id="affirmation-text"
          value={text}
          onChange={(val) => setText(val)}
          placeholder="I am manifesting a reality where my inbox responds to itself..."
          label="Daily Absurdity"
        />
        <div className="flex justify-end mt-2">
          <span className={`text-xs ${text.length > MAX_CHARS ? 'text-red-500' : 'text-secondary-text/60'}`}>
            {text.length} / {MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Category Selector */}
      <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl p-6 mb-4">
        <label className="text-[10px] tracking-[0.12em] uppercase font-bold text-secondary-text mb-3 block">
          Category of Existentialism
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-transparent text-primary-text text-base border-0 border-b border-secondary-border focus:outline-none focus:ring-0 p-2 rounded-none"
        >
          {AFFIRMATION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Anonymous Toggle */}
      <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl p-6 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isAnonymous ? (
            <EyeOff className="w-4 h-4 text-secondary-text" />
          ) : (
            <Eye className="w-4 h-4 text-secondary-text" />
          )}
          <div>
            <p className="text-sm font-medium text-primary-text">Whisper Anonymously</p>
            <p className="text-xs text-secondary-text">Hide your identity from the void.</p>
          </div>
        </div>
        <Switch
          checked={isAnonymous}
          onChange={() => setIsAnonymous(!isAnonymous)}
          size="small"
        />
      </div>

      {/* Guidelines Link */}
      <div className="bg-brand-0/40 dark:bg-gray-80/20 rounded-xl p-4 mb-6 text-center">
        <button className="text-sm font-serif italic text-secondary-text hover:text-primary-text transition-colors duration-200 inline-flex items-center gap-1.5 bg-transparent border-0 shadow-none p-0">
          Review Submission Guidelines
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!text.trim() || submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold tracking-wider uppercase bg-gradient-to-br from-brand-60 to-brand-70 dark:from-brand-30 dark:to-brand-50 text-white hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-0 shadow-none"
      >
        <Sparkles className="w-4 h-4" />
        {submitting ? 'Releasing...' : 'Release Into the Void'}
      </button>
    </div>
  );
};

export default AffirmationSubmit;
