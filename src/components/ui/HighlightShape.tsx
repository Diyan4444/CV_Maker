import React from 'react';
import { WARM_TOKENS } from '@/styles/tokens';

export type HighlightShapeVariant = 'pill' | 'ribbon' | 'arch' | 'circle' | 'hexagon';
export type HighlightFillKey = 'accentSoft' | 'page' | 'readyBg' | 'blush';

export const HIGHLIGHT_FILLS: Record<HighlightFillKey, string> = {
  accentSoft: WARM_TOKENS.accentSoft,
  page: WARM_TOKENS.page,
  readyBg: WARM_TOKENS.readyBg,
  blush: '#F7CBCA',
};

interface HighlightShapeProps {
  children: React.ReactNode;
  variant?: HighlightShapeVariant;
  fill?: HighlightFillKey;
  rotate?: number;
  className?: string;
}

export function HighlightShape({
  children,
  variant = 'pill',
  fill = 'accentSoft',
  rotate = -1.8,
  className = '',
}: HighlightShapeProps) {
  const fillHex = HIGHLIGHT_FILLS[fill];

  const renderShapePath = () => {
    switch (variant) {
      case 'ribbon':
        return 'M 4 4 L 196 4 L 188 22 L 196 40 L 4 40 L 12 22 Z';
      case 'arch':
        return 'M 4 40 L 4 22 C 4 8 24 4 100 4 C 176 4 196 8 196 22 L 196 40 Z';
      case 'circle':
        return 'M 100 3 C 162 3 197 10 197 22 C 197 34 162 41 100 41 C 38 41 3 34 3 22 C 3 10 38 3 100 3 Z';
      case 'hexagon':
        return 'M 18 4 L 182 4 L 197 22 L 182 40 L 18 40 L 3 22 Z';
      case 'pill':
      default:
        return 'M 22 4 L 178 4 A 18 18 0 0 1 178 40 L 22 40 A 18 18 0 0 1 22 4 Z';
    }
  };

  const d = renderShapePath();

  return (
    <span
      className={`relative inline-flex items-center justify-center px-3.5 py-1 text-[#24221F] font-semibold ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 200 44"
        preserveAspectRatio="none"
        style={{ transform: `rotate(${rotate}deg)` }}
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      >
        <path d={d} transform="translate(2.5, 2.5)" fill="#24221F" />
        <path d={d} fill={fillHex} stroke="#24221F" strokeWidth="1.5" />
      </svg>
      <span className="relative z-10">{children}</span>
    </span>
  );
}
