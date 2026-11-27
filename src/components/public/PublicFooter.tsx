import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PRODUCT_NAME } from '@/config/app';
import { OPERATOR_NAME, CONTACT_EMAIL } from '@/config/legal';
import { GLASS_TOKENS } from '@/styles/tokens';

export function PublicFooter() {
  return (
    <footer
      data-glass-panel="true"
      data-glass-variant="frosted"
      className="glass-panel mt-16 sm:mt-24 border-t glass-divider py-8 px-4 sm:px-8"
      style={{ borderRadius: 0, color: GLASS_TOKENS.fg }}
    >
      <div className="max-w-[1680px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
          <span className="font-display font-bold text-sm" style={{ color: GLASS_TOKENS.fg }}>{PRODUCT_NAME}</span>
          <span aria-hidden="true">&bull;</span>
          <Link
            href="/privacy"
            className="group min-h-[44px] inline-flex items-center gap-1 underline focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] rounded-xs"
            style={{ color: GLASS_TOKENS.fg }}
          >
            <span>Privacy &amp; Data Rights</span>
            <ArrowRight
              className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="text-center sm:text-right space-y-1">
          <p className="font-semibold" style={{ color: GLASS_TOKENS.fg }}>Built by {OPERATOR_NAME}</p>
          <p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="min-h-[44px] inline-flex items-center underline focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] rounded-xs"
              style={{ color: GLASS_TOKENS.accentOnGlass }}
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
