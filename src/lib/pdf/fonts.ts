import { Font } from '@react-pdf/renderer';
import path from 'node:path';

export type NotoFontFamily = 'Noto Sans' | 'Noto Serif';
export type NotoFontStyleKey = 'regular' | 'bold' | 'italic' | 'boldItalic';

const ALL_STYLE_KEYS: NotoFontStyleKey[] = ['regular', 'bold', 'italic', 'boldItalic'];
const registeredStyles = new Set<string>();
let hyphenationRegistered = false;

const FONT_DEFINITIONS: Record<
  NotoFontFamily,
  Record<NotoFontStyleKey, { file: string; fontWeight: 'normal' | 'bold'; fontStyle: 'normal' | 'italic' }>
> = {
  'Noto Sans': {
    regular: { file: 'NotoSans-Regular.woff', fontWeight: 'normal', fontStyle: 'normal' },
    bold: { file: 'NotoSans-Bold.woff', fontWeight: 'bold', fontStyle: 'normal' },
    italic: { file: 'NotoSans-Italic.woff', fontWeight: 'normal', fontStyle: 'italic' },
    boldItalic: { file: 'NotoSans-BoldItalic.woff', fontWeight: 'bold', fontStyle: 'italic' },
  },
  'Noto Serif': {
    regular: { file: 'NotoSerif-Regular.woff', fontWeight: 'normal', fontStyle: 'normal' },
    bold: { file: 'NotoSerif-Bold.woff', fontWeight: 'bold', fontStyle: 'normal' },
    italic: { file: 'NotoSerif-Italic.woff', fontWeight: 'normal', fontStyle: 'italic' },
    boldItalic: { file: 'NotoSerif-BoldItalic.woff', fontWeight: 'bold', fontStyle: 'italic' },
  },
};

/**
 * Registers only the Noto Sans / Noto Serif families and styles a document actually uses.
 * Uses subsetted .woff fonts (~76-90 KB per style) in both browser and Node.
 */
export function registerNotoFonts(
  targetFamily?: NotoFontFamily,
  styles: NotoFontStyleKey[] = ALL_STYLE_KEYS
) {
  const inWorker =
    typeof window === 'undefined' &&
    typeof self !== 'undefined' &&
    'WorkerGlobalScope' in self;
  const isBrowser = typeof window !== 'undefined' || inWorker;
  const fontBase = inWorker
    ? `${self.location.origin}/fonts`
    : isBrowser
    ? '/fonts'
    : path.resolve(process.cwd(), 'public/fonts');

  if (!hyphenationRegistered) {
    Font.registerHyphenationCallback((word) => [word]);
    hyphenationRegistered = true;
  }

  const families: NotoFontFamily[] = targetFamily ? [targetFamily] : ['Noto Sans', 'Noto Serif'];

  for (const family of families) {
    const defs = FONT_DEFINITIONS[family];
    const missingFonts: Array<{ src: string; fontWeight: 'normal' | 'bold'; fontStyle: 'normal' | 'italic' }> = [];

    for (const styleKey of styles) {
      const cacheKey = `${family}:${styleKey}`;
      if (registeredStyles.has(cacheKey)) continue;
      const def = defs[styleKey];
      missingFonts.push({
        src: `${fontBase}/${def.file}`,
        fontWeight: def.fontWeight,
        fontStyle: def.fontStyle,
      });
      registeredStyles.add(cacheKey);
    }

    if (missingFonts.length > 0) {
      Font.register({
        family,
        fonts: missingFonts,
      });
    }
  }
}
