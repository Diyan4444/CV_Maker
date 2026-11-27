import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { wcagContrast, parse, formatHex } from 'culori';
import { EMPH_HEADING_MAP } from '@/components/ui/Emph';
import { HIGHLIGHT_FILLS } from '@/components/ui/HighlightShape';
import { ON_DARK_TOKENS, BASE_TOKENS } from '@/styles/tokens';

function blendOver(fgHex: string, alpha: number, bgHex: string): string {
  const fg = parse(fgHex);
  const bg = parse(bgHex);
  if (!fg || !bg || fg.mode !== 'rgb' || bg.mode !== 'rgb') {
    throw new Error(`Invalid hex: ${fgHex} / ${bgHex}`);
  }
  return formatHex({
    mode: 'rgb',
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  })!;
}

describe('Phase 8F Landing, Glass Contrast, 4px Grid, Highlight Shapes & Emph', () => {
  it('verifies glass surface worst-case composite contrast against lightest and darkest backgrounds', () => {
    const glassAlpha = 0.88;
    const worstDarkComposite = blendOver(BASE_TOKENS.surface, glassAlpha, ON_DARK_TOKENS.charcoalBase);
    const worstLightComposite = blendOver(BASE_TOKENS.surface, glassAlpha, ON_DARK_TOKENS.contourHigh);

    expect(wcagContrast(BASE_TOKENS.ink, worstDarkComposite)).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(BASE_TOKENS.ink, worstLightComposite)).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(BASE_TOKENS.primary, worstDarkComposite)).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(BASE_TOKENS.primary, worstLightComposite)).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast('#9E4857', BASE_TOKENS.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('verifies ink text meets WCAG AA contrast (>= 4.5:1) on every highlight shape fill', () => {
    for (const [key, fillHex] of Object.entries(HIGHLIGHT_FILLS)) {
      const ratio = wcagContrast(BASE_TOKENS.ink, fillHex);
      expect(ratio, `Contrast on highlight fill ${key} (${fillHex})`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('verifies Emph uses a hard-coded map with single-word emphasis and never accepts children', () => {
    const emphSource = fs.readFileSync(
      path.join(process.cwd(), 'src', 'components', 'ui', 'Emph.tsx'),
      'utf-8'
    );
    expect(emphSource).not.toContain('children');
    for (const [key, entry] of Object.entries(EMPH_HEADING_MAP)) {
      expect(entry.emph.trim().length, `Emph word for ${key}`).toBeGreaterThan(0);
      expect(entry.emph.trim()).not.toContain(' ');
    }
  });

  it('fails if landing or public header/footer uses Tailwind arbitrary px spacing not divisible by 4', () => {
    const files = [
      path.join(process.cwd(), 'src', 'app', 'page.tsx'),
      path.join(process.cwd(), 'src', 'components', 'public', 'PublicHeader.tsx'),
      path.join(process.cwd(), 'src', 'components', 'public', 'PublicFooter.tsx'),
    ];
    const spacingRegex =
      /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[(\d+)px\]/g;

    const violations: string[] = [];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      while ((match = spacingRegex.exec(src)) !== null) {
        const px = Number(match[1]);
        if (px % 4 !== 0) {
          violations.push(`${path.basename(file)}: ${match[0]}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
