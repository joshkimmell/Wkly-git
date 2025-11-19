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

		// Local API endpoints used by frontend helper functions
		if (url.startsWith('http://localhost:3000/api/getAllGoals')) {
			return {
				ok: true,
				status: 200,
				json: async () => ({ goals: [] }),
				text: async () => JSON.stringify({ goals: [] }),
			} as unknown as Response;
		}

		// Supabase REST endpoints used by hooks (categories, accomplishments)
		if (url.includes('supabase.co/rest/v1')) {
			// categories -> return array of categories
			if (url.includes('/categories')) {
				return {
					ok: true,
					status: 200,
					json: async () => ([]),
					text: async () => JSON.stringify([]),
				} as unknown as Response;
			}

			// accomplishments -> return empty list or counts
			if (url.includes('/accomplishments')) {
				return {
					ok: true,
					status: 200,
					json: async () => ([]),
					text: async () => JSON.stringify([]),
				} as unknown as Response;
			}

			// default supabase response
			return {
				ok: true,
				status: 200,
				json: async () => ([]),
				text: async () => JSON.stringify([]),
			} as unknown as Response;
		}

		// Fallback default: return empty object
		return {
			ok: true,
			status: 200,
			json: async () => ({}),
			text: async () => JSON.stringify({}),
		} as unknown as Response;
	});
}

// Suppress only a narrow set of noisy test-time errors:
// - React "not wrapped in act(...)" messages (still noisy in some environments)
// - happy-dom fetch/AsyncTaskManager aborts that surface as "The operation was aborted"
//   originating from the happy-dom internals during environment teardown.
const originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
	try {
		const joined = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');

		// Keep the act(...) warning handling but only when it's that exact phrase.
		if (joined.includes('not wrapped in act(')) {
			return;
		}

		// Swallow only abort errors that clearly come from happy-dom's fetch/AsyncTaskManager.
		// Look for the abort phrase plus an attribution to happy-dom internals.
		if (joined.includes('The operation was aborted') && (joined.includes('happy-dom') || joined.includes('AsyncTaskManager') || joined.includes('Fetch.onAsyncTaskManagerAbort'))) {
			return;
		}
	} catch (e) {
		// ignore and fall through to original console.error
	}
	return originalConsoleError(...args);
};

afterEach(() => {
	cleanup();
	// restore any mocks created during a test to avoid cross-test leakage
	vi.restoreAllMocks();
});
