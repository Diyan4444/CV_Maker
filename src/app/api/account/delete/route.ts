import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuthUser, createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRecentSignIn } from '@/lib/account/reauth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function POST(req: NextRequest) {
  // 1. Authentication check
  let user;
  try {
    user = await requireAuthUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Strict Origin verification
  const originHeader = req.headers.get('origin');
  if (!originHeader) {
    return NextResponse.json({ error: 'Forbidden: Missing Origin header' }, { status: 403 });
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
  const expectedOriginFromHost = host ? `${proto}://${host}` : null;
  const expectedOriginFromUrl = new URL(req.url).origin;

  const isOriginMatch =
    originHeader === expectedOriginFromUrl ||
    (expectedOriginFromHost && originHeader === expectedOriginFromHost);

  if (!isOriginMatch) {
    return NextResponse.json({ error: 'Forbidden: Origin mismatch' }, { status: 403 });
  }

  // 3. Confirm email payload verification (case-insensitive)
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const confirmEmail =
    typeof body?.confirmEmail === 'string' ? body.confirmEmail.trim().toLowerCase() : '';
  const userEmail =
    typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';

  if (!confirmEmail || confirmEmail !== userEmail) {
    return NextResponse.json(
      { error: 'Confirmation email does not match account email', code: 'EMAIL_MISMATCH' },
      { status: 400 }
    );
  }

  // 4. Recent sign-in verification
  if (!isRecentSignIn(user.last_sign_in_at)) {
    return NextResponse.json(
      { error: 'Re-authentication required to perform this action', code: 'REAUTH_REQUIRED' },
      { status: 403 }
    );
  }

  // 5. Atomic deletion via Supabase Auth Admin client
  // Triggers PostgreSQL ON DELETE CASCADE on public.profiles and all 13 dependent tables
  const adminClient = createAdminClient();
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('[AUDIT] ACCOUNT_DELETION_FAILED');
    return NextResponse.json(
      { error: 'Failed to delete account', details: deleteError.message },
      { status: 500 }
    );
  }

  // 6. Audit logging: strictly event code only (no user id, no email, no content)
  console.log('[AUDIT] ACCOUNT_DELETED');

  // 7. Clear authentication cookies and sign out session
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}

  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      cookieStore.delete(cookie.name);
    }
  }

  return NextResponse.json({ ok: true });
}
