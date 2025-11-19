import { renderWithProviders, mockSupabaseAuthGetUser } from '../../../src/__tests__/test-utils/axeRender';
import { UserCategories } from '@utils/functions';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AllGoals from '@components/AllGoals';
import { vi } from 'vitest';

describe('AllGoals anchor fallback', () => {
  beforeEach(() => {
    mockSupabaseAuthGetUser({ id: 'test-user' });
  });

  it('keeps menu visible when trigger is detached (anchorPosition fallback)', async () => {
  // Use cards view so the floating bulk toolbar is rendered
  localStorage.setItem('goals_view_mode', 'cards');
    // Ensure there's at least one category so the menu renders the search input
    UserCategories.length = 0;
    UserCategories.push({ id: 'cat-1', name: 'Default' });
      // Stub fetch so the component receives one goal and the menu behavior is reachable
      const originalFetch = (globalThis as any).fetch;
      (globalThis as any).fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : String(input);
        if (url.includes('/getAllGoals')) {
          return { ok: true, status: 200, json: async () => ([{ id: '00000000-0000-0000-0000-000000000002', title: 'Goal', description: '', category: '', week_start: '2025-01-01', user_id: 'test-user', created_at: new Date().toISOString(), status: 'Not started' }]), text: async () => '[]', headers: { get: () => 'application/json' } } as any;
        }
        if (url.includes('.supabase.co/rest/v1')) {
          return { ok: true, status: 200, json: async () => ([]), text: async () => '[]' } as any;
        }
        if (url.includes('localhost:3000') || url.includes('/api/getNotes')) {
          return { ok: true, status: 200, json: async () => ({ count: 0 }), text: async () => '{}' } as any;
        }
        return originalFetch ? originalFetch(input) : { ok: true, status: 200, json: async () => ([]), text: async () => '[]' };
      });

      renderWithProviders(<AllGoals />);

  // Select the goal by clicking the table row (role="checkbox") so the bulk toolbar appears
  // Click the floating 'Select all' button to create a selection (this button is always rendered in cards view).
  // There may be multiple elements with the same aria-label (badge wrapper + button), so pick the actual button element.
  const selectAllEls = await screen.findAllByLabelText(/Select all/i);
  const selectAllBtn = selectAllEls.find((el) => el.tagName.toLowerCase() === 'button') || selectAllEls[0];
  fireEvent.click(selectAllBtn, { clientX: 10, clientY: 10 });

  // Wait for the floating toolbar's Set category button to appear
      const setCategoryBtn = await waitFor(() => screen.getByTestId('bulk-set-category-btn'), { timeout: 3000 });
  fireEvent.click(setCategoryBtn, { clientX: 100, clientY: 100 });

  // Wait for the menu input element (MUI mounts menus in a portal; the input has a stable id)
  const searchInput = (await waitFor(() => document.getElementById('bulk-category-search'))) as HTMLInputElement | null;
  if (!searchInput) throw new Error('Search input not found inside bulk category menu');

      // Detach the trigger button to simulate view switch: remove the actual button node
      const triggerButton = setCategoryBtn as HTMLElement;
      if (triggerButton && triggerButton.parentElement) {
        triggerButton.parentElement.removeChild(triggerButton);
      }

      // Attempt to interact (click) which should cause the menu to fallback to anchorPosition
      fireEvent.click(searchInput, { clientX: 120, clientY: 120 });

      // The menu should still be present
      await waitFor(() => expect(document.querySelector('[role="menu"]')).toBeTruthy());

      // restore
      (globalThis as any).fetch = originalFetch;
  });
});
