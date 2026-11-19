import React from 'react';
import Link from 'next/link';
import { PRODUCT_NAME } from '@/config/app';
import { ArrowRight, LogIn } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 sm:p-12 relative text-[#0B0B0B]">
      {/* Top Header Panel */}
      <header className="max-w-4xl mx-auto w-full bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-4 shadow-sm flex items-center justify-between">
        <span className="font-display text-xl font-bold tracking-tight text-[#0B0B0B]">
          {PRODUCT_NAME}
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0B0B0B] bg-[#FFFFFF] border border-[#6B6B6B] rounded-md hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] rounded-md shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
          >
            Get started
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Honest Hero Panel */}
      <main className="max-w-2xl w-full mx-auto my-auto bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-8 sm:p-12 shadow-md">
        <div className="space-y-6 text-center sm:text-left">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFE4D8] text-[#800021] text-xs font-semibold tracking-wide uppercase">
            Career &bull; Academic &bull; Portfolio
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B0B0B] leading-tight">
            {PRODUCT_NAME}
          </h1>

          {/* Plain sentence verbatim from docs/PRODUCT_VISION.md */}
          <p className="text-base sm:text-lg text-[#1A1A1A] leading-relaxed">
            An intelligent career-profile platform that understands the individual before generating their professional identity.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] font-semibold text-sm rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#FFFFFF] border border-[#6B6B6B] text-[#0B0B0B] hover:bg-[#F1F7F7] font-semibold text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign in to your account
            </Link>
          </div>
        </div>
      </main>

      {/* Footer Panel */}
      <footer className="max-w-4xl mx-auto w-full bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-3 text-center text-xs text-[#333333] shadow-sm">
        {PRODUCT_NAME} &bull; Master profile, resume and academic CV platform.
      </footer>
    </div>
  );
}
