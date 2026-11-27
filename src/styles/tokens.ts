import { mixHexOklab, hexToRgb } from '@/lib/color/oklab';

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatioHex(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function computeAccentOnGlass(worstCaseGlassBgHex: string): string {
  for (let i = 1; i <= 40; i++) {
    const candidate = mixHexOklab('#9E4857', '#FFFDF9', i / 40);
    if (contrastRatioHex(candidate, worstCaseGlassBgHex) >= 4.55) {
      return candidate;
    }
  }
  return '#FFFDF9';
}

/**
 * Base Warm Editorial Design Tokens (Phase 8B)
 * Only base hexes are literal; all surface mixtures and tints are computed in OKLab.
 */
export const BASE_TOKENS = {
  page: '#EFE8DE',
  surface: '#FFFDF9',
  ink: '#24221F',
  muted: '#706A63',
  accent: '#9E4857',
  primary: '#800021',
  primaryHover: '#881144',
  primaryText: '#FFFFFF',
  readyText: '#235347',
  readyBg: '#DAF1DE',
} as const;

export const SURFACE_MIXTURES = {
  surface: BASE_TOKENS.surface,
  surface1: mixHexOklab(BASE_TOKENS.surface, BASE_TOKENS.page, 0.2),
  surface2: mixHexOklab(BASE_TOKENS.surface, BASE_TOKENS.page, 0.45),
  surface3: mixHexOklab(BASE_TOKENS.surface, BASE_TOKENS.page, 0.7),
  surface4: mixHexOklab(BASE_TOKENS.surface, BASE_TOKENS.page, 0.9),
  page: BASE_TOKENS.page,
} as const;

export const ACCENT_TINTS = {
  accent: BASE_TOKENS.accent,
  accentSoft: mixHexOklab(BASE_TOKENS.surface, BASE_TOKENS.accent, 0.12),
  accentBorder: mixHexOklab(BASE_TOKENS.surface, BASE_TOKENS.accent, 0.35),
  accentStrong: mixHexOklab(BASE_TOKENS.accent, BASE_TOKENS.ink, 0.18),
} as const;

export const BORDER_TOKENS = {
  subtle: mixHexOklab(BASE_TOKENS.page, BASE_TOKENS.ink, 0.12),
  default: mixHexOklab(BASE_TOKENS.page, BASE_TOKENS.ink, 0.28),
  strong: mixHexOklab(BASE_TOKENS.page, BASE_TOKENS.ink, 0.48),
} as const;

export const ON_DARK_TOKENS = {
  charcoalBase: '#1A1A1A',
  charcoalTeal: mixHexOklab('#1A1A1A', '#0B2B26', 0.25),
  charcoalSlate: mixHexOklab('#1A1A1A', '#243A66', 0.2),
  charcoalPlum: mixHexOklab('#1A1A1A', '#881144', 0.14),
  contourLow: '#6B6B6B',
  contourHigh: '#8EB69B',
  lightestContourEstimate: mixHexOklab(
    mixHexOklab('#1A1A1A', '#243A66', 0.2),
    '#8EB69B',
    0.22
  ),
  onDarkInk: BASE_TOKENS.surface,
  onDarkWarm: BASE_TOKENS.page,
  onDarkMuted: mixHexOklab(BASE_TOKENS.page, '#6B6B6B', 0.35),
} as const;

const WORST_CASE_GLASS_BG = mixHexOklab(
  mixHexOklab('#1A1A1A', '#243A66', 0.2),
  BASE_TOKENS.surface,
  0.32
);

export const GLASS_TOKENS = {
  fg: BASE_TOKENS.surface,
  fgMuted: mixHexOklab(BASE_TOKENS.page, '#6B6B6B', 0.03),
  accentOnGlass: computeAccentOnGlass(WORST_CASE_GLASS_BG),
  rimColor: 'rgba(255, 253, 249, 0.28)',
  rimBright: 'rgba(255, 253, 249, 0.44)',
  dividerOnGlass: 'rgba(255, 253, 249, 0.12)',
  dividerOnPaper: 'rgba(36, 34, 31, 0.12)',
  fallbackBg: 'rgba(36, 34, 31, 0.88)',
  tileBg: 'rgba(255, 253, 249, 0.10)',
  tileBgHover: 'rgba(255, 253, 249, 0.16)',
} as const;

export const WARM_TOKENS = {
  ...BASE_TOKENS,
  ...SURFACE_MIXTURES,
  ...ACCENT_TINTS,
  borderSubtle: BORDER_TOKENS.subtle,
  borderDefault: BORDER_TOKENS.default,
  borderStrong: BORDER_TOKENS.strong,
} as const;

export const WARM_CSS_VARIABLES: Record<string, string> = {
  '--warm-page': WARM_TOKENS.page,
  '--warm-surface': WARM_TOKENS.surface,
  '--warm-surface-1': WARM_TOKENS.surface1,
  '--warm-surface-2': WARM_TOKENS.surface2,
  '--warm-surface-3': WARM_TOKENS.surface3,
  '--warm-surface-4': WARM_TOKENS.surface4,
  '--warm-ink': WARM_TOKENS.ink,
  '--warm-muted': WARM_TOKENS.muted,
  '--warm-accent': WARM_TOKENS.accent,
  '--warm-accent-soft': WARM_TOKENS.accentSoft,
  '--warm-accent-border': WARM_TOKENS.accentBorder,
  '--warm-accent-strong': WARM_TOKENS.accentStrong,
  '--warm-border-subtle': WARM_TOKENS.borderSubtle,
  '--warm-border-default': WARM_TOKENS.borderDefault,
  '--warm-border-strong': WARM_TOKENS.borderStrong,
  '--warm-primary': WARM_TOKENS.primary,
  '--warm-primary-hover': WARM_TOKENS.primaryHover,
  '--warm-primary-text': WARM_TOKENS.primaryText,
  '--warm-ready-text': WARM_TOKENS.readyText,
  '--warm-ready-bg': WARM_TOKENS.readyBg,
  '--glass-fg': GLASS_TOKENS.fg,
  '--glass-fg-muted': GLASS_TOKENS.fgMuted,
  '--glass-accent': GLASS_TOKENS.accentOnGlass,
  '--glass-rim': GLASS_TOKENS.rimColor,
  '--glass-rim-bright': GLASS_TOKENS.rimBright,
  '--glass-divider': GLASS_TOKENS.dividerOnGlass,
  '--paper-divider': GLASS_TOKENS.dividerOnPaper,
  '--glass-fallback-bg': GLASS_TOKENS.fallbackBg,
  '--glass-tile-bg': GLASS_TOKENS.tileBg,
  '--glass-tile-bg-hover': GLASS_TOKENS.tileBgHover,
};
