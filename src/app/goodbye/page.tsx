import React from 'react';
import Link from 'next/link';
import { PRODUCT_NAME } from '@/config/app';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export const metadata = {
  title: `Account Deleted - ${PRODUCT_NAME}`,
  description: 'Your account and data have been permanently deleted.',
};

export default function GoodbyePage() {
  return (
    <div className="min-h-screen bg-[#F1F7F7] flex flex-col justify-between p-4 sm:p-8 text-[#0B0B0B]">
      {/* Top Header Panel (Public only - no private navigation) */}
      <header className="max-w-xl mx-auto w-full bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-3.5 shadow-sm flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-[#0B0B0B] hover:text-[#800021] focus:outline-none focus:ring-2 focus:ring-[#800021] rounded"
        >
          {PRODUCT_NAME}
        </Link>
        <span className="text-xs font-semibold text-[#333333]">Account Closed</span>
      </header>

      {/* Main Confirmation Panel */}
      <main className="max-w-xl w-full mx-auto my-auto bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-10 shadow-md text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-[#DAF1DE] border border-[#235347] flex items-center justify-center mx-auto text-[#051F20]">
          <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0B] tracking-tight">
            Account Permanently Deleted
          </h1>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed max-w-md mx-auto">
            Your account credentials, master profile, resume and CV documents, website settings, and telemetry logs have been completely and permanently removed.
          </p>
        </div>

        <div className="bg-[#F1F7F7] border border-[#6B6B6B] rounded-xl p-4 text-xs text-[#333333] text-left space-y-2">
          <p className="font-semibold text-[#0B0B0B]">What happened:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Your user profile and authentication credentials were deleted from the database.</li>
            <li>All associated database records were removed via atomic database cascade.</li>
            <li>Authentication session cookies and local browser document drafts were cleared.</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
          >
            <span>Create New Account</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/privacy"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
          >
            <span>Privacy Policy</span>
          </Link>
        </div>
      </main>

      {/* Footer Panel */}
      <footer className="max-w-xl mx-auto w-full bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-3.5 text-center text-xs text-[#333333] shadow-sm">
        <div>{PRODUCT_NAME} &bull; Editorial Profile &amp; Document Engine</div>
      </footer>
    </div>
  );
}
