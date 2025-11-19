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
    // Use table view to make selection deterministic (checkbox present in DOM)
    localStorage.setItem('goals_view_mode', 'table');
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

  // Select the rendered goal via the table checkbox so the floating toolbar appears
  const selectCheckbox = await screen.findByLabelText(/Select goal\s+Goal/i);
  fireEvent.click(selectCheckbox);

  // Open the Set category menu using aria-label
  const setCategoryBtn = await screen.findByLabelText(/Set category/i);
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
