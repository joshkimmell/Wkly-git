import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock the heavy dependencies used by AllGoals
vi.mock('@components/Pagination', () => ({
  default: ({ pages, currentPage, onPageChange }: any) => (
    <div data-testid="mock-pagination">
      {pages.map((p: string) => (
        <button key={p} data-page={p} onClick={() => onPageChange(p)}>
          {p}
        </button>
      ))}
      <div>current:{currentPage}</div>
    </div>
  ),
}));

vi.mock('@components/GoalCard', () => ({ default: () => <div /> }));
vi.mock('@components/GoalForm', () => ({ default: () => <div /> }));
vi.mock('@components/SummaryGenerator', () => ({ default: () => <div /> }));
vi.mock('@components/SummaryEditor', () => ({ default: () => <div /> }));
vi.mock('@components/GoalEditor', () => ({ default: () => <div /> }));

// Mock utils/functions.fetchAllGoalsIndexed and initializeUserCategories
vi.mock('@utils/functions', async () => {
  const actual = await vi.importActual<any>('@utils/functions');
  return {
    ...actual,
    fetchAllGoalsIndexed: vi.fn(async (scope: string) => {
      if (scope === 'week') {
        // sample weeks (descending)
        return {
          indexedGoals: {
            '2025-11-24': [],
            '2025-11-17': [],
            '2025-11-10': [],
            '2025-11-03': [],
            '2025-06-30': [],
          },
          pages: ['2025-11-24','2025-11-17','2025-11-10','2025-11-03','2025-06-30'],
        };
      }
      if (scope === 'month') {
        return {
          indexedGoals: { '2025-11': [], '2025-06': [], '2025-05': [] },
          pages: ['2025-11','2025-06','2025-05'],
        };
      }
      return {
        indexedGoals: { '2025': [], '2024': [] },
        pages: ['2025','2024'],
      };
    }),
    initializeUserCategories: vi.fn(async () => {}),
  };
});

import AllGoals from '../AllGoals';
// Provide a minimal GoalsProvider and useGoalsContext mock so components using useGoalsContext don't throw
vi.mock('@context/GoalsContext', () => ({
  __esModule: true,
  GoalsProvider: ({ children }: any) => children,
  useGoalsContext: () => ({
    refreshGoals: async () => {},
    removeGoalFromCache: (_: string) => {},
    lastUpdated: undefined,
    lastAddedIds: undefined,
    setLastAddedIds: (_: any) => {},
    goals: [],
  }),
}));

describe('AllGoals pagination mapping', () => {
  it('preserves context and maps month->week to latest week in that month', async () => {
    render(<AllGoals />);

    // wait for initial fetch + render
    await waitFor(() => expect(screen.getByTestId('mock-pagination')).toBeTruthy());

  // initial should be week scope and a week page present (pick whatever the mocked first week is)
  const currentText = screen.getByText(/current:/).textContent || '';
  expect(currentText).toMatch(/2025-11-24|2025-11-17|2025-11-10|2025-11-03|2025-06-30/);

    // Switch to month
    const monthButton = screen.getByText('Month');
    fireEvent.click(monthButton);

    // Wait for month pages to render
    await waitFor(() => expect(screen.getByTestId('mock-pagination')).toBeTruthy());
    // The current page should include '2025-11' (mapped from week)
    expect(screen.getByText(/current:/).textContent).toContain('2025-11');

    // Now change page to '2025-06' (June 2025)
    const juneBtn = screen.getByRole('button', { name: '2025-06' });
    fireEvent.click(juneBtn);

    // Switch back to week scope
    const weekButton = screen.getByText('Week');
    fireEvent.click(weekButton);

    // Expect the mapping logic to pick the latest week in June, '2025-06-30'
    await waitFor(() => expect(screen.getByText(/current:/).textContent).toContain('2025-06-30'));
  });
});
