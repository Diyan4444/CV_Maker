import { describe, it, expect } from 'vitest';
import { oklab as culoriOklab } from 'culori';
import {
  ALLOWED_HEXES,
  ALL_ALLOWED_HEX_SET,
  isAllowedHex,
  hexToRgb,
  rgbToHex,
  rgbToOklab,
  oklabToRgb,
  PALETTE_RAMPS,
} from '@/lib/color/oklab';

describe('Color Palette & OKLab Lightness Ramp Builder', () => {
  it('strictly contains only the approved 24 hexes across all palettes', () => {
    expect(ALL_ALLOWED_HEX_SET.size).toBe(24);

    // Verify P1
    expect(ALLOWED_HEXES.P1).toEqual([
      '#800021',
      '#881144',
      '#243A66',
      '#C24366',
      '#FF69B4',
      '#FFE4D8',
    ]);

    // Verify P2
    expect(ALLOWED_HEXES.P2).toEqual([
      '#0B0B0B',
      '#1A1A1A',
      '#333333',
      '#6B6B6B',
      '#D9D9D9',
      '#FFFFFF',
    ]);

    // Verify P3
    expect(ALLOWED_HEXES.P3).toEqual([
      '#051F20',
      '#0B2B26',
      '#163832',
      '#235347',
      '#8EB69B',
      '#DAF1DE',
    ]);

    // Verify P4
    expect(ALLOWED_HEXES.P4).toEqual([
      '#F7CBCA',
      '#DDD3D3',
      '#F1F7F7',
      '#D5E5E5',
      '#BDD7D8',
      '#5D6B6B',
    ]);

    // Invented neutral #1A2424 must NOT be allowed
    expect(isAllowedHex('#1A2424')).toBe(false);
  });

  it('matches known reference vectors for OKLab conversion', () => {
    // 1. sRGB white -> L=1, a=0, b=0
    const white = rgbToOklab({ r: 1, g: 1, b: 1 });
    expect(white.L).toBeCloseTo(1.0, 3);
    expect(white.a).toBeCloseTo(0.0, 3);
    expect(white.b).toBeCloseTo(0.0, 3);

    // 2. sRGB red (255, 0, 0) -> approx L=0.628, a=0.225, b=0.126
    const red = rgbToOklab({ r: 1, g: 0, b: 0 });
    expect(red.L).toBeCloseTo(0.628, 3);
    expect(red.a).toBeCloseTo(0.225, 3);
    expect(red.b).toBeCloseTo(0.126, 3);

    // 3. sRGB blue (0, 0, 255) -> approx L=0.452, a=-0.032, b=-0.312
    const blue = rgbToOklab({ r: 0, g: 0, b: 1 });
    expect(blue.L).toBeCloseTo(0.452, 3);
    expect(blue.a).toBeCloseTo(-0.032, 3);
    expect(blue.b).toBeCloseTo(-0.312, 3);

    // 4. #800021 -> approx L=0.380
    const wine = rgbToOklab(hexToRgb('#800021'));
    expect(wine.L).toBeCloseTo(0.380, 2);

    // 5. #0B0B0B -> approx L=0.150
    const ink = rgbToOklab(hexToRgb('#0B0B0B'));
    expect(ink.L).toBeCloseTo(0.150, 2);
  });

  it('cross-checks all 24 hexes against the authoritative culori library', () => {
    for (const hex of ALL_ALLOWED_HEX_SET) {
      const ourLab = rgbToOklab(hexToRgb(hex));
      const culoriResult = culoriOklab(hex);
      expect(culoriResult).toBeDefined();
      if (!culoriResult) continue;

      expect(ourLab.L).toBeCloseTo(culoriResult.l, 4);
      expect(ourLab.a).toBeCloseTo(culoriResult.a, 4);
      expect(ourLab.b).toBeCloseTo(culoriResult.b, 4);
    }
  });

  it('builds color ramps sorted strictly by OKLab perceived lightness L (ascending)', () => {
    for (const [key, ramp] of Object.entries(PALETTE_RAMPS)) {
      const { stops } = ramp;
      expect(stops.length).toBeGreaterThan(0);

      for (let i = 0; i < stops.length - 1; i++) {
        const currentL = stops[i].lightness;
        const nextL = stops[i + 1].lightness;
        expect(
          currentL,
          `Palette ${key} stop ${i} (${stops[i].hex}: L=${currentL}) must be darker than stop ${i + 1} (${stops[i + 1].hex}: L=${nextL})`
        ).toBeLessThanOrEqual(nextL);
      }
    }
  });

  it('verifies P1 reserves #243A66 as cool undertone and not in main ramp stops', () => {
    const p1 = PALETTE_RAMPS.P1;
    expect(p1.undertoneHex).toBe('#243A66');
    expect(p1.stops.some((s) => s.hex === '#243A66')).toBe(false);
    expect(p1.stops.length).toBe(5);

    // Verified ascending order
    expect(p1.stops.map((s) => s.hex)).toEqual([
      '#800021',
      '#881144',
      '#C24366',
      '#FF69B4',
      '#FFE4D8',
    ]);
  });

  it('verifies P4 (Mist) strictly ascending order matches true OKLab lightness', () => {
    const p4 = PALETTE_RAMPS.P4;
    // Ascending L: #5D6B6B (0.5161) < #BDD7D8 (0.8603) < #DDD3D3 (0.8749) < #F7CBCA (0.8798) < #D5E5E5 (0.9099) < #F1F7F7 (0.9716)
    expect(p4.stops.map((s) => s.hex)).toEqual([
      '#5D6B6B',
      '#BDD7D8',
      '#DDD3D3',
      '#F7CBCA',
      '#D5E5E5',
      '#F1F7F7',
    ]);
  });

  it('verifies bidirectional OKLab conversion fidelity', () => {
    for (const hex of ALL_ALLOWED_HEX_SET) {
      const rgb = hexToRgb(hex);
      const oklab = rgbToOklab(rgb);
      const backRgb = oklabToRgb(oklab);
      const backHex = rgbToHex(backRgb);

      expect(backHex.toUpperCase()).toBe(hex.toUpperCase());
    }
  });
});
