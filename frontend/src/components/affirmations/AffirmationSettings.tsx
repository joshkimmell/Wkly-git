import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Clock, Save } from 'lucide-react';
import { fetchAffirmationPreferences, updateAffirmationPreferences } from '@utils/affirmationApi';
import { AFFIRMATION_CATEGORIES } from '../../types/affirmations';
import { notifySuccess, notifyError } from '@components/ToastyNotification';
import type { AffirmationPreferences } from '../../types/affirmations';
import LoadingSpinner from '@components/LoadingSpinner';
import { Switch, Typography } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const AffirmationSettings: React.FC = () => {
  const [prefs, setPrefs] = useState<AffirmationPreferences>({
    daily_notification: true,
    notification_time: '09:00',
    preferred_categories: ['General'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAffirmationPreferences();
      setPrefs(data);
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAffirmationPreferences(prefs);
      setPrefs(updated);
      setDirty(false);
      notifySuccess('Preferences committed to reality');
    } catch {
      notifyError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePref = <K extends keyof AffirmationPreferences>(key: K, value: AffirmationPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const toggleCategory = (cat: string) => {
    setPrefs(prev => {
      const cats = new Set(prev.preferred_categories);
      if (cats.has(cat)) {
        cats.delete(cat);
        if (cats.size === 0) cats.add('General');
      } else {
        cats.add(cat);
      }
      return { ...prev, preferred_categories: Array.from(cats) };
    });
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner variant="mui" />
      </div>
    );
  }

  return (
    <section className="space-y-2 p-2">
      {/* Header */}
      <div className="mb-8">
        <Typography variant="h6" gutterBottom>Daily Affirmations</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
            Fine-tune your daily dose of existential dread and unearned confidence.
        </Typography>
      </div>

      {/* Daily Dose Toggle */}
      <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl px-6 mb-0">
        <div className="flex items-start w-1/2 justify-between">
          <div>
            <Bell className="w-5 h-5 text-brand-60 dark:text-brand-30 mb-2" />
            <h3 className="text-base font-bold text-primary-text">Daily Dose</h3>
            <p className="text-sm text-secondary-text mt-1">
              Receive a push notification containing a mildly offensive but deeply moving affirmation.
            </p>
          </div>
          <Switch
            checked={prefs.daily_notification}
            onChange={() => updatePref('daily_notification', !prefs.daily_notification)}
            size="small"
          />
        </div>
      </div>

      {/* Delivery Time */}
      {prefs.daily_notification && (
        <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl p-6 mb-4">
          <Clock className="w-5 h-5 text-brand-60 dark:text-brand-30 mb-2" />
          <label className="text-[10px] tracking-[0.12em] uppercase font-bold text-secondary-text block mb-2">
            Delivery Time
          </label>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimePicker
              value={dayjs(`2000-01-01T${prefs.notification_time}`)}
              onChange={(newValue) => {
                if (newValue) updatePref('notification_time', newValue.format('HH:mm'));
              }}
              slotProps={{ textField: { size: 'small', fullWidth: false } }}
            />
          </LocalizationProvider>
          <p className="text-xs italic text-secondary-text/60 mt-2">
            Recommended: Between breakfast and the first existential crisis of the day.
          </p>
        </div>
      )}

      {/* Preferred Categories */}
      <div className="bg-brand-0/60 dark:bg-gray-80/30 rounded-xl p-6 mb-6">
        <label className="text-[10px] tracking-[0.12em] uppercase font-bold text-secondary-text block mb-3">
          Preferred Domains of Affirmation
        </label>
        <div className="flex flex-wrap gap-2">
          {AFFIRMATION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border-0 shadow-none ${
                prefs.preferred_categories.includes(cat)
                  ? 'bg-brand-60 dark:bg-brand-30 text-white dark:text-gray-90'
                  : 'bg-brand-0 dark:bg-gray-80 text-secondary-text hover:bg-brand-10 dark:hover:bg-gray-70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-gradient-to-br from-brand-60 to-brand-70 dark:from-brand-30 dark:to-brand-50 text-white hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed border-0 shadow-none"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Commit to Reality'}
        </button>
        {dirty && (
          <span className="text-xs text-secondary-text/60 italic">Unsaved changes</span>
        )}
      </div>

      {/* Footer links */}
      <div className="mt-12 space-y-3">
        <button
          onClick={() => {
            setPrefs(prev => ({
              ...prev,
              daily_notification: true,
              notification_time: '09:00',
              preferred_categories: ['General'],
            }));
            setDirty(true);
          }}
          className="text-xs font-serif italic text-secondary-text/60 hover:text-secondary-text underline underline-offset-4 transition-colors duration-200 bg-transparent border-0 shadow-none p-0 block"
        >
          Reset all vibes to factory apathy
        </button>
      </div>
    </section>
  );
};

export default AffirmationSettings;
