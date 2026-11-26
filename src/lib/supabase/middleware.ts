import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/navigation/safe-redirect';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const totalStart = performance.now();
  const authStart = performance.now();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authDur = (performance.now() - authStart).toFixed(1);

  // Redirect authenticated users away from /login
  if (request.nextUrl.pathname === '/login' && user) {
    const rawNext =
      request.nextUrl.searchParams.get('next') ??
      request.nextUrl.searchParams.get('redirectTo') ??
      request.nextUrl.searchParams.get('returnTo');
    const target = safeNextPath(rawNext, '/dashboard');
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Protected paths
  const protectedPaths = ['/dashboard', '/onboarding', '/profile', '/editor', '/settings'];
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', safeNextPath(request.nextUrl.pathname, '/dashboard'));
    return NextResponse.redirect(url);
  }

  // Server-Timing headers for page requests (/dashboard, /profile, /editor/[id])
  const path = request.nextUrl.pathname;
  const isMonitoredPage =
    path === '/dashboard' || path === '/profile' || path.startsWith('/editor/');

  let dbDur = '0.0';
  if (user && isMonitoredPage) {
    const dbStart = performance.now();
    await supabase.from('master_profiles').select('id').eq('user_id', user.id).limit(1);
    dbDur = (performance.now() - dbStart).toFixed(1);
  }

  const totalDur = (performance.now() - totalStart).toFixed(1);
  if (isMonitoredPage) {
    const serverTiming = `total;dur=${totalDur}, auth;dur=${authDur}, db;dur=${dbDur}`;
    supabaseResponse.headers.set('Server-Timing', serverTiming);
  }

  return supabaseResponse;
}
