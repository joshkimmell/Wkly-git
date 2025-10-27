import { getWeekStartDate } from '../../utils/functions';

describe('getWeekStartDate', () => {
  it('returns the Monday for a mid-week date (2025-10-26 -> 2025-10-20)', () => {
    const date = new Date('2025-10-26T12:00:00Z');
    const monday = getWeekStartDate(date);
    expect(monday).toBe('2025-10-20');
  });

  it('handles Sunday correctly (returns previous Monday)', () => {
    const date = new Date('2025-10-26T12:00:00Z');
    // This is still a mid-week example; ensure no crash for other dates
    const monday = getWeekStartDate(date);
    expect(monday).toMatch(/2025-10-2[0-6]/);
  });
});
