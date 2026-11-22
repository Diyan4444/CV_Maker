'use client';

import React, { useEffect } from 'react';
import { PRODUCT_NAME } from '@/config/app';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError] Root layout runtime error captured:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F7F7F8] flex items-center justify-center p-4">
        <div
          role="alert"
          className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl shadow-md p-8 max-w-md w-full text-center space-y-4"
        >
          <span className="font-serif text-2xl font-bold tracking-tight text-[#1A1A1A]">
            {PRODUCT_NAME}
          </span>

          <div className="w-10 h-10 rounded-full bg-[#FFE4D8] border border-[#800021] flex items-center justify-center mx-auto text-[#800021]">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-lg font-bold text-[#1A1A1A]">
              Application Error
            </h1>
            <p className="text-xs text-[#333333]">
              A critical error occurred while initializing the application shell.
            </p>
          </div>

          {error.digest && (
            <p className="font-mono text-[10px] text-[#6B6B6B] bg-[#F1F7F7] border border-[#D9D9D9] rounded p-1.5 break-all">
              Digest: {error.digest}
            </p>
          )}

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#800021] hover:bg-[#881144] text-white text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Try again</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
