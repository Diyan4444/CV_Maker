import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { safeNextPath } from '@/lib/navigation/safe-redirect';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin, searchParams } = new URL(request.url);
  const rawNext = searchParams.get('next') ?? searchParams.get('redirectTo');
  const target = safeNextPath(rawNext, '/login');
  return NextResponse.redirect(new URL(target, origin));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { origin, searchParams } = new URL(request.url);
  const rawNext = searchParams.get('next') ?? searchParams.get('redirectTo');
  const target = safeNextPath(rawNext, '/login');
  return NextResponse.redirect(new URL(target, origin));
}
