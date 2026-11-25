import React from 'react';
import { requireAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';
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
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 text-[#0B0B0B] overflow-x-hidden">
      <div>
        <AppHeader />
        <main className="max-w-4xl mx-auto w-full min-w-0">
          <SettingsClient
            user={{
              id: user.id,
              email: user.email || '',
              createdAt: user.created_at,
            }}
          />
        </main>
      </div>

      {/* Dashboard Footer Panel */}
      <footer className="max-w-4xl mx-auto w-full mt-6 bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-4 sm:px-6 py-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#333333] text-center sm:text-left">
        <div>{PRODUCT_NAME} &bull; Privacy-first Profile &amp; Document Engine</div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/api/account/export"
            download
            className="hover:underline hover:text-[#0B0B0B] min-h-[44px] inline-flex items-center px-1"
          >
            Export all data (JSON)
          </a>
          <span aria-hidden="true">&bull;</span>
          <Link
            href="/privacy"
            className="hover:underline hover:text-[#0B0B0B] min-h-[44px] inline-flex items-center px-1"
          >
            Privacy &amp; Data Rights
          </Link>
        </div>
      </footer>
    </div>
  );
}
