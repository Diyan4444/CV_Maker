import { describe, it, expect } from 'vitest';
import { getContrastRatio, isAACompliant } from '@/config/contrast';
import { wcagContrast } from 'culori';

describe('WCAG 2.1 Color Contrast for Hidden Section Panels (#F1F7F7 background)', () => {
  const checkPair = (fg: string, bg: string, label: string) => {
    const computed = getContrastRatio(fg, bg);
    const culoriVal = Number(wcagContrast(fg, bg).toFixed(2));
    console.log(`[WCAG Computed] ${label} (${fg} on ${bg}): ${computed}:1 (culori: ${culoriVal}:1)`);
    expect(Math.abs(computed - culoriVal)).toBeLessThanOrEqual(0.05);
    return computed;
  };

  it('computes exact contrast ratios for text on solid hidden section panel (#F1F7F7)', () => {
    const ratio1A = checkPair('#1A1A1A', '#F1F7F7', 'Body text #1A1A1A');
    const ratio33 = checkPair('#333333', '#F1F7F7', 'Muted text #333333');
    const ratio6B = checkPair('#6B6B6B', '#F1F7F7', 'Placeholder/Border #6B6B6B');
    const ratio0B = checkPair('#0B0B0B', '#F1F7F7', 'Title/Heading #0B0B0B');
    const ratioBadge = checkPair('#800021', '#FFE4D8', 'Hidden badge #800021 on #FFE4D8');

    // Assert WCAG AA compliance (>= 4.5:1 for normal text, >= 3.0:1 for UI components)
    expect(isAACompliant(ratio1A)).toBe(true);
    expect(isAACompliant(ratio33)).toBe(true);
    expect(isAACompliant(ratio6B)).toBe(true);
    expect(isAACompliant(ratio0B)).toBe(true);
    expect(isAACompliant(ratioBadge)).toBe(true);
  });
});
