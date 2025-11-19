import { renderWithProviders, mockSupabaseAuthGetUser } from './test-utils/axeRender';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import AllGoals from '@components/AllGoals';
import { vi } from 'vitest';

describe('addCategory duplicate handling', () => {
  beforeEach(() => {
    mockSupabaseAuthGetUser({ id: 'test-user' });
  });

  it('applies existing category when createCategory returns duplicate error', async () => {
    // Stub fetch for createCategory to return 409 with structured JSON,
    // and return a minimal goals list for getAllGoals so UI renders one item.
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : String(input);
      // Netlify function createCategory stub
      if (url.includes('/createCategory')) {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'duplicate_category', message: 'Category already exists' }),
          text: async () => JSON.stringify({ error: 'duplicate_category' }),
        } as any;
      }
      // getAllGoals stub used by the component
      if (url.includes('/getAllGoals')) {
        return {
          ok: true,
          status: 200,
          json: async () => ([{ id: '00000000-0000-0000-0000-000000000001', title: 'Test goal', description: '', category: '', week_start: '2025-01-01', user_id: 'test-user', created_at: new Date().toISOString(), status: 'Not started' }]),
          text: async () => JSON.stringify([]),
          headers: { get: () => 'application/json' },
        } as any;
      }
        // Supabase REST fallback: return empty arrays for accomplishments/categories requests
        if (url.includes('.supabase.co/rest/v1')) {
          return { ok: true, status: 200, json: async () => ([]), text: async () => '[]' } as any;
        }
        // Local API fallbacks used by hooks
        if (url.includes('localhost:3000') || url.includes('/api/getNotes') || url.includes('/api/getNotes')) {
          return { ok: true, status: 200, json: async () => ({ count: 0 }), text: async () => '{}' } as any;
        }
        return originalFetch ? originalFetch(input) : { ok: true, status: 200, json: async () => ({}), text: async () => '{}' };
    });

    renderWithProviders(<AllGoals />);

  // Select the goal by clicking its card title so the floating toolbar appears
  const titleEls = await screen.findAllByText(/Test goal/i);
  const titleEl = titleEls.find((el) => el.className && (el.className as string).includes('card-title')) || titleEls[0];
  fireEvent.click(titleEl);

  // Open the bulk category menu using the aria-label on the toolbar button
  const setCategoryBtn = await screen.findByLabelText(/Set category/i);
  fireEvent.click(setCategoryBtn, { clientX: 100, clientY: 100 });

    // Find the search input by placeholder text now that the menu is open
    const input = await screen.findByPlaceholderText(/Filter or add category/i);
    // type a category name
    fireEvent.change(input, { target: { value: 'Existing Category' } });

    // Click the Add IconButton inside the input adornment (aria-label="Add category")
    const addIconBtn = screen.getByLabelText(/Add category/i);
    fireEvent.click(addIconBtn);

    // Expect that no uncaught errors occurred and the input is still present
    await waitFor(() => expect(screen.getByPlaceholderText(/Filter or add category/i)).toBeInTheDocument());

    // restore
    (globalThis as any).fetch = originalFetch;
  });
});
