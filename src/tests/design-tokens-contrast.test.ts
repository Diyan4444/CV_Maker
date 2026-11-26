import { describe, it, expect } from 'vitest';
import { wcagContrast } from 'culori';
import { BASE_TOKENS, SURFACE_MIXTURES, ACCENT_TINTS, WARM_TOKENS, ON_DARK_TOKENS } from '@/styles/tokens';

function ratio(fg: string, bg: string): number {
  return Math.round(wcagContrast(fg, bg) * 100) / 100;
}

describe('Phase 8B Warm Design Tokens & WCAG Contrast Audit', () => {
  it('computes and prints WCAG ratios for ink, muted, and accent across page, surface, and all mixtures', () => {
    const backgrounds = Object.entries(SURFACE_MIXTURES);
    const foregrounds: Array<[string, string]> = [
      ['ink', BASE_TOKENS.ink],
      ['muted', BASE_TOKENS.muted],
      ['accent', BASE_TOKENS.accent],
      ['accentStrong', ACCENT_TINTS.accentStrong],
    ];

    console.log('\n=== PHASE 8B WARM TOKEN CONTRAST MATRIX ===');
    for (const [bgName, bgHex] of backgrounds) {
      for (const [fgName, fgHex] of foregrounds) {
        const r = ratio(fgHex, bgHex);
        const passAA = r >= 4.5 ? 'PASS AA' : r >= 3.0 ? 'LARGE-ONLY' : 'FAIL';
        console.log(`  ${fgName.padEnd(12)} (${fgHex}) on ${bgName.padEnd(9)} (${bgHex}) -> ${r.toFixed(2)}:1 [${passAA}]`);
      }
    }
    console.log(`  primaryText  (${BASE_TOKENS.primaryText}) on primary   (${BASE_TOKENS.primary}) -> ${ratio(BASE_TOKENS.primaryText, BASE_TOKENS.primary).toFixed(2)}:1`);
    console.log(`  primaryText  (${BASE_TOKENS.primaryText}) on primHover (${BASE_TOKENS.primaryHover}) -> ${ratio(BASE_TOKENS.primaryText, BASE_TOKENS.primaryHover).toFixed(2)}:1`);
    console.log(`  readyText    (${BASE_TOKENS.readyText}) on readyBg   (${BASE_TOKENS.readyBg}) -> ${ratio(BASE_TOKENS.readyText, BASE_TOKENS.readyBg).toFixed(2)}:1`);
    console.log('===========================================\n');

    // Ink must pass >= 4.5:1 on every surface and page
    for (const [bgName, bgHex] of backgrounds) {
      expect(ratio(BASE_TOKENS.ink, bgHex), `ink on ${bgName}`).toBeGreaterThanOrEqual(4.5);
    }

    // Muted (#706A63) is allowed ONLY on surface tones where it passes 4.5:1:
    // Must pass on surface (#FFFDF9) and surface1, and MUST fail on page (#EFE8DE) as expected
    expect(ratio(BASE_TOKENS.muted, SURFACE_MIXTURES.surface)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(BASE_TOKENS.muted, SURFACE_MIXTURES.surface1)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(BASE_TOKENS.muted, SURFACE_MIXTURES.page)).toBeLessThan(4.5);

    // Primary and Ready pills
    expect(ratio(WARM_TOKENS.primaryText, WARM_TOKENS.primary)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(WARM_TOKENS.primaryText, WARM_TOKENS.primaryHover)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(WARM_TOKENS.readyText, WARM_TOKENS.readyBg)).toBeGreaterThanOrEqual(4.5);

    // On-dark tokens must pass >= 4.5:1 on both charcoal base and lightest contour area
    const darkSurfaces: Array<[string, string]> = [
      ['charcoalBase', ON_DARK_TOKENS.charcoalBase],
      ['lightestContourEstimate', ON_DARK_TOKENS.lightestContourEstimate],
    ];
    for (const [bgName, bgHex] of darkSurfaces) {
      expect(ratio(ON_DARK_TOKENS.onDarkInk, bgHex), `onDarkInk on ${bgName}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(ON_DARK_TOKENS.onDarkWarm, bgHex), `onDarkWarm on ${bgName}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(ON_DARK_TOKENS.onDarkMuted, bgHex), `onDarkMuted on ${bgName}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
