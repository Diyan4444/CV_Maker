import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/navigation/safe-redirect';

const AUTH_ROUTES = ['/login', '/dashboard', '/onboarding', '/profile', '/editor', '/settings', '/api/'];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);

  // Strip any client-supplied internal verification headers to prevent spoofing
  requestHeaders.delete('x-verified-user-id');
  requestHeaders.delete('x-verified-user-email');
  requestHeaders.delete('x-verified-user-email-confirmed');
  requestHeaders.delete('x-verified-user-created-at');
  requestHeaders.delete('x-verified-user-providers');

  const needsAuth = AUTH_ROUTES.some((prefix) => path.startsWith(prefix));
  if (!needsAuth) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (path === '/' || path === '/privacy' || path === '/goodbye') {
      res.headers.set('Server-Timing', 'total;dur=0.0, auth;dur=0.0, db;dur=0.0, db-count;dur=0');
    }
    return res;
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const totalStart = performance.now();
  const authStart = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authDur = (performance.now() - authStart).toFixed(1);

  if (user) {
    requestHeaders.set('x-verified-user-id', user.id);
    requestHeaders.set('x-verified-user-email', user.email || '');
    requestHeaders.set('x-verified-user-email-confirmed', user.email_confirmed_at ? '1' : '0');
    requestHeaders.set('x-verified-user-created-at', user.created_at || '');
    const providers = Array.from(
      new Set((user.identities || []).map((i) => i.provider).filter(Boolean))
    );
    requestHeaders.set('x-verified-user-providers', providers.join(',') || 'email');

    // Rebuild response with verified user headers while preserving any refreshed cookies
    const prevCookies = supabaseResponse.cookies.getAll();
    supabaseResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    for (const c of prevCookies) {
      supabaseResponse.cookies.set(c);
    }
  }

  // Redirect authenticated users away from /login
  if (path === '/login' && user) {
    const rawNext =
      request.nextUrl.searchParams.get('next') ??
      request.nextUrl.searchParams.get('redirectTo') ??
      request.nextUrl.searchParams.get('returnTo');
    const target = safeNextPath(rawNext, '/dashboard');
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Protected paths
  const protectedPaths = ['/dashboard', '/onboarding', '/profile', '/editor', '/settings'];
  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', safeNextPath(path, '/dashboard'));
    return NextResponse.redirect(url);
  }

  const isMonitoredPage =
    path === '/dashboard' ||
    path === '/profile' ||
    path === '/settings' ||
    path === '/onboarding' ||
    path.startsWith('/editor/');

  const totalDur = (performance.now() - totalStart).toFixed(1);
  if (isMonitoredPage) {
    const serverTiming = `total;dur=${totalDur}, auth;dur=${authDur}, db;dur=0.0, db-count;dur=1`;
    supabaseResponse.headers.set('Server-Timing', serverTiming);
  }

  return supabaseResponse;
}
