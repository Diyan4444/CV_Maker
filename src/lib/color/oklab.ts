/**
 * Strictly Enforced 24-Hex Palette System
 * P1 (Wine), P2 (Ink), P3 (Forest), P4 (Mist)
 */
export const ALLOWED_HEXES = {
  P1: ['#800021', '#881144', '#243A66', '#C24366', '#FF69B4', '#FFE4D8'] as const,
  P2: ['#0B0B0B', '#1A1A1A', '#333333', '#6B6B6B', '#D9D9D9', '#FFFFFF'] as const,
  P3: ['#051F20', '#0B2B26', '#163832', '#235347', '#8EB69B', '#DAF1DE'] as const,
  P4: ['#F7CBCA', '#DDD3D3', '#F1F7F7', '#D5E5E5', '#BDD7D8', '#5D6B6B'] as const,
} as const;

export type PaletteKey = keyof typeof ALLOWED_HEXES;

export const ALL_ALLOWED_HEX_SET = new Set<string>([
  ...ALLOWED_HEXES.P1,
  ...ALLOWED_HEXES.P2,
  ...ALLOWED_HEXES.P3,
  ...ALLOWED_HEXES.P4,
]);

/**
 * Validates that a given hex string belongs to the official 24-color palette.
 */
export function isAllowedHex(hex: string): boolean {
  return ALL_ALLOWED_HEX_SET.has(hex.toUpperCase()) || ALL_ALLOWED_HEX_SET.has(hex);
}

export interface RGB {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
}

export interface OKLab {
  L: number; // 0..1 (perceived lightness)
  a: number; // green (-) to red (+)
  b: number; // blue (-) to yellow (+)
}

/**
 * Converts a 6-character hex string (#RRGGBB) to sRGB [0..1]
 */
export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const num = parseInt(clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Converts sRGB [0..1] to Hex string (#RRGGBB)
 */
export function rgbToHex(rgb: RGB): string {
  const to255 = (c: number) => Math.max(0, Math.min(255, Math.round(c * 255)));
  const rHex = to255(rgb.r).toString(16).padStart(2, '0');
  const gHex = to255(rgb.g).toString(16).padStart(2, '0');
  const bHex = to255(rgb.b).toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

/**
 * Converts sRGB component [0..1] to Linear RGB [0..1]
 */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts Linear RGB component [0..1] to sRGB [0..1]
 */
function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c));
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/**
 * Converts RGB [0..1] to OKLab color space
 */
export function rgbToOklab(rgb: RGB): OKLab {
  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);

  // Linear RGB to LMS
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // Non-linear step
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS to OKLab
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

/**
 * Converts OKLab color to sRGB [0..1]
 */
export function oklabToRgb(lab: OKLab): RGB {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
  };
}

/**
 * Computes perceived lightness (OKLab L) for a hex color.
 */
export function getHexLightness(hex: string): number {
  return rgbToOklab(hexToRgb(hex)).L;
}

/**
 * Ramp Entry with hex, RGB, OKLab, and calculated lightness
 */
export interface RampStop {
  hex: string;
  rgb: RGB;
  oklab: OKLab;
  lightness: number;
}

/**
 * Builds an algorithmic color ramp for a palette by sorting its hexes
 * strictly by perceived lightness (OKLab L) from darkest (strongest) to lightest.
 *
 * For P1 (Wine), #243A66 is excluded from the main ramp stops and reserved
 * as the cool undertone in organic domain warping.
 */
export function buildPaletteRamp(paletteKey: PaletteKey): {
  palette: PaletteKey;
  stops: RampStop[];
  undertoneHex?: string;
  undertoneRgb?: RGB;
  undertoneOklab?: OKLab;
} {
  const rawHexes = ALLOWED_HEXES[paletteKey];
  
  // Verify all hexes are allowed
  for (const h of rawHexes) {
    if (!isAllowedHex(h)) {
      throw new Error(`Forbidden hex color detected in palette ${paletteKey}: ${h}`);
    }
  }

  let rampHexes = [...rawHexes];
  let undertoneHex: string | undefined;

  // #243A66 in P1 is reserved as a cool undertone, not a main ramp stop
  if (paletteKey === 'P1') {
    undertoneHex = '#243A66';
    rampHexes = rampHexes.filter((h) => h.toUpperCase() !== '#243A66');
  }

  const stops: RampStop[] = rampHexes.map((hex) => {
    const rgb = hexToRgb(hex);
    const oklab = rgbToOklab(rgb);
    return {
      hex: hex.toUpperCase(),
      rgb,
      oklab,
      lightness: oklab.L,
    };
  });

  // Sort ascending by perceived lightness (darkest/strongest -> lightest/softest)
  stops.sort((a, b) => a.lightness - b.lightness);

  let undertoneRgb: RGB | undefined;
  let undertoneOklab: OKLab | undefined;
  if (undertoneHex) {
    undertoneRgb = hexToRgb(undertoneHex);
    undertoneOklab = rgbToOklab(undertoneRgb);
  }

  return {
    palette: paletteKey,
    stops,
    undertoneHex,
    undertoneRgb,
    undertoneOklab,
  };
}

/**
 * Pre-computed ramps for each of the 4 official palettes
 */
export const PALETTE_RAMPS = {
  P1: buildPaletteRamp('P1'),
  P2: buildPaletteRamp('P2'),
  P3: buildPaletteRamp('P3'),
  P4: buildPaletteRamp('P4'),
} as const;
