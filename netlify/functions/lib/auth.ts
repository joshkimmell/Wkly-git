import { createClient } from '@supabase/supabase-js';
import type { HandlerEvent } from '@netlify/functions';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Shared admin client used only for JWT verification — never passed to callers
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

type AuthSuccess = { userId: string; error: null };
type AuthFailure = { userId: null; error: { statusCode: number; body: string } };
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Verifies the Supabase JWT from the Authorization header.
 * Returns the verified userId, or a ready-to-return error response.
 *
 * Usage:
 *   const auth = await requireAuth(event);
 *   if (auth.error) return auth.error;
 *   const { userId } = auth;
 */
export async function requireAuth(event: HandlerEvent): Promise<AuthResult> {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace(/^Bearer\s*/i, '').trim();

  if (!token) {
    return {
      userId: null,
      error: { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) },
    };
  }

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return {
      userId: null,
      error: { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) },
    };
  }

  return { userId: user.id, error: null };
}
