import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/navigation/safe-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? searchParams.get('redirectTo') ?? searchParams.get('returnTo');
  const next = safeNextPath(rawNext, '/dashboard');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page or login with message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
