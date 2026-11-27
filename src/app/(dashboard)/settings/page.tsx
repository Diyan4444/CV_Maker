import React from 'react';
import { getVerifiedUser } from '@/lib/supabase/server';
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
  const user = await getVerifiedUser();
  if (!user) {
    redirect('/login?next=/settings');
  }

  return (
    <AppShell userEmail={user.email || ''} currentPath="/settings">
      <main className="max-w-5xl w-full min-w-0">
        <SettingsClient
          user={{
            email: user.email || '',
            emailVerified: Boolean(user.email_confirmed_at),
            createdAt: user.created_at,
            providers: user.providers,
          }}
        />
      </main>
    </AppShell>
  );
}
