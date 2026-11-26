import { describe, it, expect } from 'vitest';
import { getContrastRatio, isAACompliant } from '../config/contrast';
import { wcagContrast } from 'culori';

describe('Design System Contrast & Palette Verification (Part B & Step 0)', () => {
  const PANELS = {
    white: '#FFFFFF',       // P2: Ink
    mistSurface: '#F1F7F7', // P4: Mist
    peachSurface: '#FFE4D8',// P1: Wine
  };

  const TEXT = {
    heading: '#0B0B0B',
    body: '#1A1A1A',
    muted: '#333333',
    placeholder: '#6B6B6B',
  };

  function assertWithCulori(fg: string, bg: string, label: string) {
    const ratio = getContrastRatio(fg, bg);
    const culoriRatio = Number(wcagContrast(fg, bg).toFixed(2));
    expect(
      Math.abs(ratio - culoriRatio),
      `${label}: custom ratio (${ratio}) differs from culori (${culoriRatio})`
    ).toBeLessThanOrEqual(0.05);
    return ratio;
  }

  it('Heading text (#0B0B0B) meets WCAG AA (>= 4.5:1) across all panel surfaces', () => {
    for (const [name, surface] of Object.entries(PANELS)) {
      const ratio = assertWithCulori(TEXT.heading, surface, `Heading #0B0B0B on ${name}`);
      console.log(`[WCAG Contrast] Heading #0B0B0B on ${name} (${surface}): ${ratio}:1`);
      expect(isAACompliant(ratio, false)).toBe(true);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Body text (#1A1A1A) meets WCAG AA (>= 4.5:1) across all panel surfaces', () => {
    for (const [name, surface] of Object.entries(PANELS)) {
      const ratio = assertWithCulori(TEXT.body, surface, `Body #1A1A1A on ${name}`);
      console.log(`[WCAG Contrast] Body #1A1A1A on ${name} (${surface}): ${ratio}:1`);
      expect(isAACompliant(ratio, false)).toBe(true);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Muted text (#333333) meets WCAG AA (>= 4.5:1) across all panel surfaces', () => {
    for (const [name, surface] of Object.entries(PANELS)) {
      const ratio = assertWithCulori(TEXT.muted, surface, `Muted #333333 on ${name}`);
      console.log(`[WCAG Contrast] Muted #333333 on ${name} (${surface}): ${ratio}:1`);
      expect(isAACompliant(ratio, false)).toBe(true);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Placeholder text (#6B6B6B) meets WCAG AA on white (#FFFFFF) and mist (#F1F7F7), but strictly fails on peach (#FFE4D8)', () => {
    const ratioWhite = assertWithCulori(TEXT.placeholder, PANELS.white, 'Placeholder on #FFFFFF');
    console.log(`[WCAG Contrast] Placeholder #6B6B6B on #FFFFFF: ${ratioWhite}:1`);
    expect(ratioWhite).toBeGreaterThanOrEqual(4.5);

    const ratioMist = assertWithCulori(TEXT.placeholder, PANELS.mistSurface, 'Placeholder on #F1F7F7');
    console.log(`[WCAG Contrast] Placeholder #6B6B6B on #F1F7F7: ${ratioMist}:1`);
    expect(ratioMist).toBeGreaterThanOrEqual(4.5);

    // Explicit check: #6B6B6B on #FFE4D8 yields 4.40:1 which FAILS WCAG AA for normal text (< 4.5:1).
    // Therefore form inputs are strictly restricted to #FFFFFF panels.
    const ratioPeach = assertWithCulori(TEXT.placeholder, PANELS.peachSurface, 'Placeholder on #FFE4D8');
    console.log(`[WCAG Contrast] Placeholder #6B6B6B on #FFE4D8: ${ratioPeach}:1 (Fails AA: < 4.5)`);
    expect(ratioPeach).toBeLessThan(4.5);
    expect(isAACompliant(ratioPeach, false)).toBe(false);
  });

  it('Primary button (#800021 base, #881144 hover) with #FFFFFF text meets WCAG AA (>= 4.5:1)', () => {
    const baseRatio = assertWithCulori('#FFFFFF', '#800021', 'Base button #FFFFFF on #800021');
    console.log(`[WCAG Contrast] Button text #FFFFFF on #800021: ${baseRatio}:1`);
    expect(baseRatio).toBeGreaterThanOrEqual(4.5);

    const hoverRatio = assertWithCulori('#FFFFFF', '#881144', 'Hover button #FFFFFF on #881144');
    console.log(`[WCAG Contrast] Button hover text #FFFFFF on #881144: ${hoverRatio}:1`);
    expect(hoverRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('Secondary button (#FFFFFF background, #1A1A1A text, #6B6B6B border, #F1F7F7 hover) meets WCAG AA', () => {
    const textRatio = assertWithCulori('#1A1A1A', '#FFFFFF', 'Secondary button text');
    console.log(`[WCAG Contrast] Secondary button text #1A1A1A on #FFFFFF: ${textRatio}:1`);
    expect(textRatio).toBeGreaterThanOrEqual(4.5);

    const borderRatio = assertWithCulori('#6B6B6B', '#FFFFFF', 'Secondary button border');
    console.log(`[WCAG Contrast] Secondary button border #6B6B6B on #FFFFFF: ${borderRatio}:1`);
    expect(borderRatio).toBeGreaterThanOrEqual(3.0);

    const hoverTextRatio = assertWithCulori('#0B0B0B', '#F1F7F7', 'Secondary button hover');
    console.log(`[WCAG Contrast] Secondary button hover text #0B0B0B on #F1F7F7: ${hoverTextRatio}:1`);
    expect(hoverTextRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('Form input components (#6B6B6B border on #FFFFFF, #1A1A1A text) meet UI and text requirements', () => {
    const borderRatio = assertWithCulori('#6B6B6B', '#FFFFFF', 'Input border');
    console.log(`[WCAG Contrast] Input border #6B6B6B on #FFFFFF: ${borderRatio}:1`);
    expect(borderRatio).toBeGreaterThanOrEqual(3.0);

    const valueRatio = assertWithCulori('#1A1A1A', '#FFFFFF', 'Input value');
    console.log(`[WCAG Contrast] Input value #1A1A1A on #FFFFFF: ${valueRatio}:1`);
    expect(valueRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('Error states (#800021 text on #FFE4D8 banner and #800021 on #FFFFFF) meet WCAG AA (>= 4.5:1)', () => {
    const bannerRatio = assertWithCulori('#800021', '#FFE4D8', 'Error text on #FFE4D8');
    console.log(`[WCAG Contrast] Error text #800021 on #FFE4D8 banner: ${bannerRatio}:1`);
    expect(bannerRatio).toBeGreaterThanOrEqual(4.5);

    const directRatio = assertWithCulori('#800021', '#FFFFFF', 'Error text on #FFFFFF');
    console.log(`[WCAG Contrast] Error text #800021 on #FFFFFF: ${directRatio}:1`);
    expect(directRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('Focus ring (#800021) meets UI component requirement (>= 3:1) against all panel surfaces', () => {
    for (const [name, surface] of Object.entries(PANELS)) {
      const ringRatio = assertWithCulori('#800021', surface, `Focus ring #800021 on ${name}`);
      console.log(`[WCAG Contrast] Focus ring #800021 on ${name} (${surface}): ${ringRatio}:1`);
      expect(ringRatio).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('Catches known failing low-contrast pairings (e.g. #D9D9D9 on #FFFFFF fails 3:1 UI threshold)', () => {
    const lowContrastRatio = assertWithCulori('#D9D9D9', '#FFFFFF', '#D9D9D9 on #FFFFFF');
    console.log(`[WCAG Contrast] Low-contrast pair #D9D9D9 on #FFFFFF: ${lowContrastRatio}:1 (Fails UI: < 3.0)`);
    expect(lowContrastRatio).toBeLessThan(3.0);
  });
});
