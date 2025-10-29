import { describe, it, expect } from 'vitest';
import { mapPageForScope, computeDefaultForScope } from './pagination';

describe('pagination helper', () => {
  it('maps week -> month correctly', () => {
    const prevSelected = '2025-11-04';
    const pages: string[] = ['2025-11-24', '2025-11-17', '2025-11-10', '2025-11-03'];
    const mapped = mapPageForScope(prevSelected, 'month', pages);
    expect(mapped).toBe('2025-11');
  });

  it('maps month -> latest week in that month', () => {
    const prevSelected = '2025-06';
    const pages: string[] = ['2025-06-30', '2025-06-23', '2025-05-26'];
    const mapped = mapPageForScope(prevSelected, 'week', pages);
    expect(mapped).toBe('2025-06-30');
  });

  it('maps year -> month default', () => {
    const now = new Date('2025-11-04');
    const defaultMonth = computeDefaultForScope('month', now);
    expect(defaultMonth).toBe('2025-11');
  });
});
