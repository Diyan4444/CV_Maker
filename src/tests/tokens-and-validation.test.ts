import { describe, it, expect } from 'vitest';
import { getContrastRatio, isAACompliant } from '../config/contrast';
import { PALETTES } from '../config/palettes';
import { isValidUsername } from '../config/app';

describe('Design System Contrast & Palette Verification', () => {
  it('all semantic text and surface pairings strictly pass WCAG AA (>= 4.5:1 normal, >= 3.0:1 large)', () => {
    for (const [id, palette] of Object.entries(PALETTES)) {
      const { bg, surface, text, textMuted, accent } = palette.semantic;

      const bodyRatioBg = getContrastRatio(text, bg);
      expect(isAACompliant(bodyRatioBg, false), `${id} body on bg (${text} on ${bg})`).toBe(true);

      const bodyRatioSurface = getContrastRatio(text, surface);
      expect(isAACompliant(bodyRatioSurface, false), `${id} body on surface (${text} on ${surface})`).toBe(true);

      const mutedRatioBg = getContrastRatio(textMuted, bg);
      expect(isAACompliant(mutedRatioBg, false), `${id} muted on bg (${textMuted} on ${bg})`).toBe(true);

      const mutedRatioSurface = getContrastRatio(textMuted, surface);
      expect(isAACompliant(mutedRatioSurface, false), `${id} muted on surface (${textMuted} on ${surface})`).toBe(true);

      const accentRatioBg = getContrastRatio(accent, bg);
      expect(isAACompliant(accentRatioBg, true), `${id} accent on bg (${accent} on ${bg})`).toBe(true);

      const accentRatioSurface = getContrastRatio(accent, surface);
      expect(isAACompliant(accentRatioSurface, true), `${id} accent on surface (${accent} on ${surface})`).toBe(true);
    }
  });

  it('documents and catches forbidden extreme raw combos (e.g. pink on peach fails AA)', () => {
    const rawPink = PALETTES.wine.raw.c5; // #FF69B4
    const rawPeach = PALETTES.wine.raw.c6; // #FFE4D8
    const ratio = getContrastRatio(rawPink, rawPeach);
    expect(ratio).toBeLessThan(4.5);
    expect(isAACompliant(ratio, false)).toBe(false);
  });
});

describe('Username Validation & Security Rules', () => {
  it('accepts valid alphanumeric usernames with hyphens', () => {
    expect(isValidUsername('johndoe').valid).toBe(true);
    expect(isValidUsername('john-doe').valid).toBe(true);
    expect(isValidUsername('user123').valid).toBe(true);
  });

  it('rejects reserved system usernames', () => {
    expect(isValidUsername('admin').valid).toBe(false);
    expect(isValidUsername('api').valid).toBe(false);
    expect(isValidUsername('login').valid).toBe(false);
    expect(isValidUsername('dashboard').valid).toBe(false);
    expect(isValidUsername('u').valid).toBe(false);
  });

  it('rejects invalid length or malformed usernames', () => {
    expect(isValidUsername('ab').valid).toBe(false); // too short
    expect(isValidUsername('-leadinghyphen').valid).toBe(false);
    expect(isValidUsername('trailinghyphen-').valid).toBe(false);
    expect(isValidUsername('john_doe').valid).toBe(false); // underscore disallowed
    expect(isValidUsername('john doe').valid).toBe(false); // space disallowed
  });
});
