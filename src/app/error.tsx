'use client';

import React, { useEffect } from 'react';
import { PRODUCT_NAME } from '@/config/app';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[RootError] Application runtime error captured:', error);
  }, [error]);

  return (
    <div
      id="root-error-container"
      role="alert"
      className="min-h-screen flex items-center justify-center p-4 bg-[#F7F7F8]"
    >
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl shadow-md p-8 max-w-md w-full text-center space-y-4">
        <span className="font-serif text-2xl font-bold tracking-tight text-[#1A1A1A]">
          {PRODUCT_NAME}
        </span>

        <div className="w-10 h-10 rounded-full bg-[#FFE4D8] border border-[#800021] flex items-center justify-center mx-auto text-[#800021]">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h1 className="font-serif text-lg font-bold text-[#1A1A1A]">
            Something unexpected occurred
          </h1>
          <p className="text-xs text-[#333333]">
            We were unable to render this page. You can attempt to reload it, or return to the dashboard.
          </p>
        </div>

        {error.digest && (
          <p className="font-mono text-[10px] text-[#6B6B6B] bg-[#F1F7F7] border border-[#D9D9D9] rounded p-1.5 break-all">
            Digest: {error.digest}
          </p>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => retry()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#800021] hover:bg-[#881144] text-white text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Try again</span>
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[40px] rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
