'use client';

import React from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GLASS_TOKENS, WARM_TOKENS } from '@/styles/tokens';
import { hexToRgb, mixHexOklab } from '@/lib/color/oklab';

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relLum(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function wcag(fg: string, bg: string): number {
  const l1 = relLum(fg);
  const l2 = relLum(bg);
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

const COMPUTED_CONTRAST: Record<string, { fg: number; muted: number; accent: number }> = (() => {
  const base = mixHexOklab('#1A1A1A', '#243A66', 0.2);
  const comps: Record<string, string> = {
    light: mixHexOklab(base, '#FFFDF9', 0.13),
    frosted: mixHexOklab(base, '#FFFDF9', 0.18),
    dense: mixHexOklab(base, '#FFFDF9', 0.32),
    lite: mixHexOklab(base, '#FFFDF9', 0.34),
    solid: '#24221F',
  };
  const next: Record<string, { fg: number; muted: number; accent: number }> = {};
  for (const [k, bg] of Object.entries(comps)) {
    next[k] = {
      fg: wcag(GLASS_TOKENS.fg, bg),
      muted: wcag(GLASS_TOKENS.fgMuted, bg),
      accent: wcag(GLASS_TOKENS.accentOnGlass, bg),
    };
  }
  return next;
})();

export function GlassGalleryClient() {
  const measured = COMPUTED_CONTRAST;

  const presets = [
    { key: 'light', title: 'Light', desc: 'Fill 0.10 diagonal, blur 16px', variant: 'light' as const, dataGlass: 'light' },
    { key: 'frosted', title: 'Frosted (Default)', desc: 'Fill 0.18 -> 0.06, blur 22px', variant: 'frosted' as const, dataGlass: 'frosted' },
    { key: 'dense', title: 'Dense', desc: 'Fill 0.32 -> 0.22, blur 28px', variant: 'dense' as const, dataGlass: 'dense' },
    { key: 'lite', title: 'Lite (Weak device / Auto fallback)', desc: 'No blur, fill 0.34, same light colour roles', variant: 'frosted' as const, dataGlass: 'lite' },
    { key: 'solid', title: 'Solid (@supports not fallback)', desc: 'No blur, #24221F at 88% opaque dark panel', variant: 'frosted' as const, dataGlass: 'solid' },
  ];

  return (
    <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 space-y-8">
      <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: GLASS_TOKENS.fg }}>
          Glassmorphism Preset Gallery
        </h1>
        <p className="text-xs sm:text-sm max-w-[70ch]" style={{ color: GLASS_TOKENS.fgMuted }}>
          Presets, lite mode, and @supports not fallback rendered over the live topographic canvas with worst-case WCAG contrast ratios.
        </p>
      </GlassPanel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        {presets.map((p) => {
          const ratios = measured[p.key];
          return (
            <div key={p.key} data-glass={p.dataGlass} className="rounded-[20px]">
              <GlassPanel
                variant={p.variant}
                accentBorder
                className="p-6 space-y-4"
                style={
                  p.key === 'lite'
                    ? { background: 'rgba(255, 253, 249, 0.34)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }
                    : p.key === 'solid'
                    ? { background: 'rgba(36, 34, 31, 0.88)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
                    {p.title}
                  </h2>
                  <span className="text-xs font-semibold" style={{ color: GLASS_TOKENS.accentOnGlass }}>
                    Accent sample
                  </span>
                </div>
                <p className="text-xs" style={{ color: GLASS_TOKENS.fgMuted }}>
                  {p.desc}
                </p>
                {ratios && (
                  <div className="glass-tile rounded-lg p-3 grid grid-cols-3 gap-2 text-xs" data-testid={`contrast-${p.key}`}>
                    <div>
                      <div style={{ color: GLASS_TOKENS.fgMuted }}>fg</div>
                      <div className="font-bold" style={{ color: GLASS_TOKENS.fg }}>{ratios.fg}:1</div>
                    </div>
                    <div>
                      <div style={{ color: GLASS_TOKENS.fgMuted }}>fgMuted</div>
                      <div className="font-bold" style={{ color: GLASS_TOKENS.fg }}>{ratios.muted}:1</div>
                    </div>
                    <div>
                      <div style={{ color: GLASS_TOKENS.fgMuted }}>accent</div>
                      <div className="font-bold" style={{ color: GLASS_TOKENS.fg }}>{ratios.accent}:1</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    className="min-h-[44px] px-4 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: WARM_TOKENS.primary, color: WARM_TOKENS.primaryText }}
                  >
                    Primary
                  </button>
                  <button type="button" className="btn-glass-secondary min-h-[44px] px-4 rounded-lg text-xs font-semibold">
                    Secondary
                  </button>
                </div>
              </GlassPanel>
            </div>
          );
        })}
      </div>
    </main>
  );
}
