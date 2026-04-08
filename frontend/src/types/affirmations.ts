export interface Affirmation {
  id: string;
  text: string;
  category: string;
  author: string | null;
  source: string | null;
  is_featured: boolean;
  submitted_by: string | null;
  is_anonymous: boolean;
  status: 'pending' | 'approved' | 'rejected';
  featured_date: string | null;
  created_at: string;
  updated_at: string;
  submitter_username?: string | null;
  submitter_email?: string | null;
}

export interface SavedAffirmation {
  id: string;
  saved_at: string;
  affirmation: Affirmation;
}

export interface AffirmationPreferences {
  daily_notification: boolean;
  notification_time: string;
  preferred_categories: string[];
}

export interface AffirmationsPage {
  affirmations: Affirmation[];
  total: number;
  page: number;
  limit: number;
}

export const AFFIRMATION_CATEGORIES = [
  'General',
  'Productivity',
  'Self-Awareness',
  'Relationships',
  'Achievement',
  'Existential',
  'Wellness',
  'Identity',
  'Mindfulness',
  'Growth',
  'Self-Discovery',
  'Wealth',
  'Daily Ritual',
  'Survival',
  'Philosophy',
  'Satire',
  'Time Management',
  'Optimism',
  'Corporate Ennui',
  'Digital Decay',
  'Manifestation',
  'Self-Care',
  'Efficiency',
  'Morning Routine',
] as const;

export type AffirmationCategory = typeof AFFIRMATION_CATEGORIES[number];
