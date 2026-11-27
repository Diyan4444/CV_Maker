import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PRODUCT_NAME } from '@/config/app';
import { OPERATOR_NAME, CONTACT_EMAIL } from '@/config/legal';

export function PublicFooter() {
  return (
    <footer className="mt-16 sm:mt-24 border-t border-[#D8D0C5] bg-[#FFFDF9] py-8 px-4 sm:px-8 text-[#24221F]">
      <div className="max-w-[1680px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
          <span className="font-display font-bold text-sm text-[#24221F]">{PRODUCT_NAME}</span>
          <span aria-hidden="true">&bull;</span>
          <Link
            href="/privacy"
            className="group text-[#24221F] hover:text-[#800021] min-h-[44px] inline-flex items-center gap-1 underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-xs"
          >
            <span>Privacy &amp; Data Rights</span>
            <ArrowRight
              className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="text-center sm:text-right space-y-1">
          <p className="font-semibold text-[#24221F]">Built by {OPERATOR_NAME}</p>
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
