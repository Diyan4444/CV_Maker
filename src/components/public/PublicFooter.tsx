import React from 'react';
import Link from 'next/link';
import { PRODUCT_NAME } from '@/config/app';
import { OPERATOR_NAME, CONTACT_EMAIL } from '@/config/legal';

export function PublicFooter() {
  return (
    <footer className="mt-16 sm:mt-24 border-t border-[#6B6B6B] bg-[#FFFFFF] py-8 px-4 sm:px-6 text-[#333333]">
      <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
          <span className="font-display font-bold text-sm text-[#0B0B0B]">{PRODUCT_NAME}</span>
          <span aria-hidden="true">&bull;</span>
          <Link
            href="/privacy"
            className="text-[#1A1A1A] hover:text-[#800021] min-h-[44px] inline-flex items-center underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-xs"
          >
            Privacy &amp; Data Rights
          </Link>
        </div>

        <div className="text-center sm:text-right space-y-1">
          <p className="font-semibold text-[#0B0B0B]">Built by {OPERATOR_NAME}</p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#800021] hover:text-[#881144] min-h-[44px] inline-flex items-center underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-xs"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
