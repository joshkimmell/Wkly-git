import { mapPageForScope, computeDefaultForScope } from './pagination';

describe('pagination helpers - mapPageForScope', () => {
  it('maps a week page to its month', () => {
    const week = '2025-08-18';
    const pages: string[] = ['2025-08-18', '2025-08-11'];
    const mapped = mapPageForScope(week, 'month', pages);
    expect(mapped).toBe('2025-08');
  });

  it('maps a month to the first matching week in pages', () => {
    const month = '2025-08';
    const pages = ['2025-07-28', '2025-08-04', '2025-08-11', '2025-09-01'];
    const mapped = mapPageForScope(month, 'week', pages);
    expect(mapped).toBe('2025-08-04');
  });

  it('maps a year to the current month when target is month', () => {
    const year = '2025';
    const pages: string[] = ['2025-01', '2025-08', '2024-12'];
    const mapped = mapPageForScope(year, 'month', pages, new Date('2025-08-04'));
    expect(mapped).toBe('2025-08');
  });

  it('returns undefined when prevSelected is falsy', () => {
    const mapped = mapPageForScope(undefined, 'month', []);
    expect(mapped).toBeUndefined();
  });

  it('computeDefaultForScope returns expected month string', () => {
    const now = new Date('2025-11-04');
    const defaultMonth = computeDefaultForScope('month', now);
    expect(defaultMonth).toBe('2025-11');
  });
});
