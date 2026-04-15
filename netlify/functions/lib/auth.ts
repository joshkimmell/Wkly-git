import { createClient } from '@supabase/supabase-js';
import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Shared admin client used only for JWT verification — never passed to callers
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type AuthSuccess = { userId: string; error: null };
type AuthFailure = { userId: null; error: { statusCode: number; headers: Record<string, string>; body: string } };
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the verified userId, or a ready-to-return error response.
 * Also handles CORS preflight (OPTIONS) automatically.
 *
 * Usage:
 *   const auth = await requireAuth(event);
 *   if (auth.error) return auth.error;
 *   const { userId } = auth;
 */
export async function requireAuth(event: HandlerEvent): Promise<AuthResult> {
  // Handle CORS preflight — return early before any auth logic
  if (event.httpMethod === 'OPTIONS') {
    return {
      userId: null,
      error: { statusCode: 204, headers: CORS_HEADERS, body: '' },
    };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s*/i, '').trim();

  if (!token) {
    return {
      userId: null,
      error: { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) },
    };
  }

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return {
      userId: null,
      error: { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) },
    };
  }

  return { userId: user.id, error: null };
}

/**
 * Higher-order function that wraps a Netlify handler to automatically:
 * - Handle CORS preflight OPTIONS requests (returns 204 with CORS headers)
 * - Inject `Access-Control-Allow-Origin: *` into ALL responses
 *
 * Usage:
 *   export const handler = withCors(async (event) => { ... });
 */
export function withCors(fn: Handler): Handler {
  return async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }
    const response = (await fn(event, context)) as HandlerResponse;
    response.headers = { ...CORS_HEADERS, ...(response.headers ?? {}) };
    return response;
  };
}
