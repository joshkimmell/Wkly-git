import React from 'react';
import { render } from '@testing-library/react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import supabase from '@lib/supabase';

// Provide a fake session/user for components that call supabase.auth.getUser
export const mockSupabaseAuthGetUser = (overrides?: Partial<{ id: string }>) => {
  const fakeUser = { id: overrides?.id || 'test-user-id' };
  const getUser = async () => ({ data: { user: fakeUser } });
  // jest style mocking is not available in Vitest here, so overwrite the function directly
  // but keep a reference to restore if necessary
  try {
    // @ts-ignore
    supabase.auth.getUser = getUser;
  } catch (e) {
    // ignore in case it's read-only in test environment
  }
  return fakeUser;
};

export const renderWithProviders = (ui: React.ReactElement) => {
  // ensure SessionContextProvider is present in case components rely on it
  return render(<SessionContextProvider supabaseClient={supabase}>{ui}</SessionContextProvider>);
};

export const renderWithAxe = (ui: React.ReactElement) => {
  mockSupabaseAuthGetUser();

  // Stub global fetch so components that call backend APIs won't throw network errors during tests
  // Keep a reference to the original fetch so other tests can restore it if needed
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async () => {
    const fake = {
      ok: true,
      status: 200,
      headers: { get: (_: string) => 'application/json' },
  json: async () => [],
      text: async () => '[]',
    } as any;
    return fake;
  };

  const result = renderWithProviders(ui);

  // Restore fetch after a tick (tests will run synchronously afterwards)
  setTimeout(() => {
    try {
      (globalThis as any).fetch = originalFetch;
    } catch (e) {
      // ignore
    }
  }, 0);

  return result;
};
