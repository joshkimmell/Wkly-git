import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest globals are enabled via package.json config (globals: true)
// Global test setup:
// - Tell React tests we're in an act environment so async updates are handled
// - Provide a lightweight global fetch mock so components that call network
//   during mount don't cause real network traffic or AbortErrors during teardown
// - Ensure cleanup and mock restore after each test

// Signal to React that tests are running in an environment that supports act()
// This suppresses many "not wrapped in act(...)" warnings when using testing helpers.
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Basic global fetch mock: return empty arrays for common REST endpoints used in tests
// Adjust or override in individual tests with vi.spyOn(global, 'fetch').mockImplementation(...)
if (!(globalThis as any).fetch) {
	(globalThis as any).fetch = vi.fn(async (input: RequestInfo | URL) => {
		const url = typeof input === 'string' ? input : String(input);
		// Return empty list for Supabase-like REST endpoints
		if (url.includes('/rest/v1/') || url.includes('/supabase.co/rest/v1')) {
			return {
				ok: true,
				status: 200,
				json: async () => ([]),
				text: async () => JSON.stringify([]),
			} as unknown as Response;
		}

		// Default: return empty object
		return {
			ok: true,
			status: 200,
			json: async () => ({}),
			text: async () => JSON.stringify({}),
		} as unknown as Response;
	});
}

// Suppress noisy act(...) warnings and fetch AbortError messages in test output.
// These warnings are useful during development but clutter CI/test logs; individual
// tests should still assert correctness rather than rely on suppressed warnings.
const originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
	try {
		const first = args[0];
		if (typeof first === 'string') {
			if (first.includes('not wrapped in act(') || first.includes('The operation was aborted')) {
				return; // swallow
			}
		}
	} catch (e) {
		// ignore
	}
	return originalConsoleError(...args);
};

afterEach(() => {
	cleanup();
	// restore any mocks created during a test to avoid cross-test leakage
	vi.restoreAllMocks();
});
