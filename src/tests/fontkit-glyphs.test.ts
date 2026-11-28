import { describe, it, expect } from 'vitest';
import path from 'node:path';
// @ts-expect-error fontkit module has no bundled types
import * as fontkitModule from 'fontkit';

const fontkit: any = (fontkitModule as any).default || fontkitModule;
import {
  ONE_PAGE_RESUME_FIXTURE,
  TWO_PAGE_RESUME_FIXTURE,
  THREE_PAGE_ACADEMIC_CV_FIXTURE,
  EXTREME_EDGE_CASE_FIXTURE,
} from '@/lib/fixtures/document-fixtures';

const REGISTERED_WOFF_FILES = [
  'NotoSans-Regular.woff',
  'NotoSans-Bold.woff',
  'NotoSans-Italic.woff',
  'NotoSans-BoldItalic.woff',
  'NotoSerif-Regular.woff',
  'NotoSerif-Bold.woff',
  'NotoSerif-Italic.woff',
  'NotoSerif-BoldItalic.woff',
];

const SPEC_TEST_NAMES = [
  'Łukasz Żółć',
  'Şahin Çelik',
  'Nguyễn Văn Đạt',
  'Řehoř Dvořák',
  'Søren Müller',
  '–', // en dash (U+2013)
  '—', // em dash (U+2014)
  '•', // bullet (U+2022)
  '“', // left double quote (U+201C)
  '”', // right double quote (U+201D)
  '‘', // left single quote (U+2018)
  '’', // right single quote (U+2019)
];

function extractStringsFromObject(obj: unknown): string[] {
  const strings: string[] = [];
  function recurse(val: unknown) {
    if (typeof val === 'string') {
      strings.push(val);
    } else if (Array.isArray(val)) {
      val.forEach(recurse);
    } else if (val && typeof val === 'object') {
      Object.values(val as Record<string, unknown>).forEach(recurse);
    }
  }
  recurse(obj);
  return strings;
}

describe('Fontkit TTF Glyph Coverage Test', () => {
  const allFixtureStrings = [
    ...extractStringsFromObject(ONE_PAGE_RESUME_FIXTURE),
    ...extractStringsFromObject(TWO_PAGE_RESUME_FIXTURE),
    ...extractStringsFromObject(THREE_PAGE_ACADEMIC_CV_FIXTURE),
    ...extractStringsFromObject(EXTREME_EDGE_CASE_FIXTURE),
    ...SPEC_TEST_NAMES,
  ];

  // Collect unique characters to test
  const uniqueCodePoints = new Map<number, string>();
  for (const str of allFixtureStrings) {
    for (const char of str) {
      // Exclude newlines, carriage returns, tabs, and standard spaces from strict glyph checks if applicable
      const cp = char.codePointAt(0);
      if (cp !== undefined && cp > 32) {
        uniqueCodePoints.set(cp, char);
      }
    }
  }

  for (const woffName of REGISTERED_WOFF_FILES) {
    it(`asserts that every character in fixtures and test names exists in ${woffName}`, () => {
      const fontPath = path.resolve(process.cwd(), 'public/fonts', woffName);
      const font = fontkit.openSync(fontPath);

      const missingGlyphs: Array<{ char: string; codePoint: string }> = [];

      for (const [cp, char] of uniqueCodePoints.entries()) {
        if (!font.hasGlyphForCodePoint(cp)) {
          missingGlyphs.push({
            char,
            codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
          });
        }
      }

      if (missingGlyphs.length > 0) {
        console.error(
          `Missing glyphs in ${woffName} (${missingGlyphs.length}):`,
          missingGlyphs.slice(0, 10)
        );
      }

      expect(
        missingGlyphs,
        `Font ${woffName} is missing ${missingGlyphs.length} glyphs: ${missingGlyphs.map((g) => `${g.char} (${g.codePoint})`).join(', ')}`
      ).toHaveLength(0);
    });
  }

  it('verifies subset coverage (Vietnamese, currency, arrows, punctuation) and kerning in WOFF', () => {
    const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSans-Regular.woff');
    const font = fontkit.openSync(fontPath);
    for (const ch of ['A', 'é', 'Ł', 'ơ', 'ậ', '–', '—', '•', '“', '”', '€', '£', '$', '₹']) {
      expect(font.hasGlyphForCodePoint(ch.codePointAt(0)!), `Missing ${ch}`).toBe(true);
    }
    const run = font.layout('AVATAR');
    expect(run.glyphs.length).toBe(6);
    expect(font.availableFeatures).toContain('kern');
  });

  it('fails if an unsupported glyph is tested (negative verification)', () => {
    const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSans-Regular.woff');
    const font = fontkit.openSync(fontPath);
    // Devanagari character 'क' (U+0915) is not in Noto Sans Latin WOFF
    const devanagariCp = 'क'.codePointAt(0)!;
    expect(font.hasGlyphForCodePoint(devanagariCp)).toBe(false);
  });
});
