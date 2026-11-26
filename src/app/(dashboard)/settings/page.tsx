import React from 'react';
import { requireAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/navigation/AppShell';
import { SettingsClient } from './SettingsClient';
import { PRODUCT_NAME } from '@/config/app';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: `Account Settings - ${PRODUCT_NAME}`,
  description: 'Manage account credentials, data exports, and privacy settings.',
};

export default async function SettingsPage() {
  let user;
  try {
    user = await requireAuthUser();
  } catch {
    redirect('/login?next=/settings');
  }

  return (
    <AppShell userEmail={user.email || ''} currentPath="/settings">
      <div className="flex flex-col justify-between min-h-[calc(100vh-8rem)] gap-6">
        <main className="max-w-4xl w-full min-w-0">
          <SettingsClient
            user={{
              id: user.id,
              email: user.email || '',
              createdAt: user.created_at,
            }}
          />
        </main>

        {/* Dashboard Footer Panel */}
        <footer className="max-w-4xl w-full bg-[#FFFDF9] border border-[#6B6B6B] rounded-xl px-4 sm:px-6 py-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#24221F] text-center sm:text-left">
          <div>{PRODUCT_NAME} &bull; Privacy-first Profile &amp; Document Engine</div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="/api/account/export"
              download
              className="hover:underline min-h-[44px] inline-flex items-center px-1"
            >
              Export all data (JSON)
            </a>
            <span aria-hidden="true">&bull;</span>
            <Link
              href="/privacy"
              className="hover:underline min-h-[44px] inline-flex items-center px-1"
            >
              Privacy &amp; Data Rights
            </Link>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
