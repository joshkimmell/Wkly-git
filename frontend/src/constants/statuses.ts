export const STATUSES = ['Not started', 'In progress', 'Completed', 'Blocked', 'On hold'] as const;

export const STATUS_COLORS: Record<string, string> = {
  'Not started': '#9CA3AF',
  'In progress': '#2563EB',
  'Completed': '#16A34A',
  'Blocked': '#DC2626',
  'On hold': '#D97706',
};

export type Status = (typeof STATUSES)[number];
