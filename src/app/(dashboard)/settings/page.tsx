import React from 'react';
import { requireAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/navigation/AppShell';
import { SettingsClient } from './SettingsClient';
import { PRODUCT_NAME } from '@/config/app';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: `Account Settings - ${PRODUCT_NAME}`,
  description: 'Manage account information, sign-in methods, data exports, and interface preferences.',
};

export default async function SettingsPage() {
  let user;
  try {
    user = await requireAuthUser();
  } catch {
    redirect('/login?next=/settings');
  }

  const providers = Array.from(
    new Set(
      (user.identities || [])
        .map((identity) => identity.provider)
        .filter((p): p is string => Boolean(p))
    )
  );
  if (providers.length === 0) {
    providers.push('email');
  }

  return (
    <AppShell userEmail={user.email || ''} currentPath="/settings">
      <main className="max-w-5xl w-full min-w-0">
        <SettingsClient
          user={{
            email: user.email || '',
            emailVerified: Boolean(user.email_confirmed_at),
            createdAt: user.created_at,
            providers,
          }}
        />
      </main>
    </AppShell>
  );
}
