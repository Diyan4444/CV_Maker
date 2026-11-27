import { cache } from 'react';
import { createServerClient as ssrCreateServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return ssrCreateServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}

export { createClient as createServerClient };

export interface VerifiedSessionUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  providers: string[];
}

/**
 * Reads the middleware-verified user from internal request headers (avoiding a duplicate
 * auth.getUser() round trip in Server Components), falling back to supabase.auth.getUser().
 */
export const getVerifiedUser = cache(async (): Promise<VerifiedSessionUser | null> => {
  try {
    const hdrs = await headers();
    const verifiedId = hdrs.get('x-verified-user-id');
    if (verifiedId) {
      const providersRaw = hdrs.get('x-verified-user-providers') || 'email';
      return {
        id: verifiedId,
        email: hdrs.get('x-verified-user-email') || '',
        email_confirmed_at: hdrs.get('x-verified-user-email-confirmed') === '1' ? 'verified' : null,
        created_at: hdrs.get('x-verified-user-created-at') || '',
        providers: providersRaw.split(',').filter(Boolean),
      };
    }
  } catch {
    // headers() unavailable outside request context
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const providers = Array.from(
    new Set((user.identities || []).map((i) => i.provider).filter(Boolean))
  );
  return {
    id: user.id,
    email: user.email || '',
    email_confirmed_at: user.email_confirmed_at ?? null,
    created_at: user.created_at,
    providers: providers.length > 0 ? providers : ['email'],
  };
});

/**
 * Server-side verified user session helper for mutating API routes (always checks auth.getUser()
 * directly so session revocation is enforced immediately).
 */
export async function requireAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}
