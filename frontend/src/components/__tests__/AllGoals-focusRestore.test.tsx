import { renderWithProviders, mockSupabaseAuthGetUser } from '../../../src/__tests__/test-utils/axeRender';
import { UserCategories } from '@utils/functions';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AllGoals from '@components/AllGoals';
import { vi } from 'vitest';

// This test ensures the bulk menu returns focus to its trigger button when closed
describe('AllGoals focus restore', () => {
  beforeEach(() => {
    mockSupabaseAuthGetUser({ id: 'test-user' });
  });

  it('restores focus to the bulk category trigger when the menu closes', async () => {
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

    // Render the component
    renderWithProviders(<AllGoals />);

    // Ensure the floating toolbar's button is present (uses test id)
    const trigger = await screen.findByTestId('bulk-set-category-btn');

    // Focus it and open the menu (simulate click)
    trigger.focus();
    fireEvent.click(trigger, { clientX: 10, clientY: 10 });

  // Wait for menu input to appear (MUI portals use stable id)
  const input = await waitFor(() => document.getElementById('bulk-category-search'));
  expect(input).toBeTruthy();

  // Close the menu by clicking a category item (Default) which should close the menu and restore focus
  const menuItem = await waitFor(() => screen.getByText('Default'));
  fireEvent.click(menuItem);

    // Wait for the menu to be removed from the DOM
    await waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull(), { timeout: 2000 });

    // Wait for focus to be restored to the trigger (or a focusable child inside it)
    await waitFor(
      () =>
        expect(
          document.activeElement === trigger || (trigger as HTMLElement).contains(document.activeElement as Node)
        ).toBeTruthy(),
      { timeout: 2000 }
    );

    // restore original fetch
    (globalThis as any).fetch = originalFetch;
  });
});
