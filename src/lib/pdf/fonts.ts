import { Font } from '@react-pdf/renderer';
import path from 'node:path';

const registeredFamilies = new Set<string>();
let hyphenationRegistered = false;

export function registerNotoFonts(targetFamily?: 'Noto Sans' | 'Noto Serif') {
  const isBrowser = typeof window !== 'undefined';
  const fontBase = isBrowser ? '/fonts' : path.resolve(process.cwd(), 'public/fonts');

  if (!hyphenationRegistered) {
    Font.registerHyphenationCallback((word) => [word]);
    hyphenationRegistered = true;
  }

  const families: Array<'Noto Sans' | 'Noto Serif'> = targetFamily
    ? [targetFamily]
    : ['Noto Sans', 'Noto Serif'];

  for (const family of families) {
    if (registeredFamilies.has(family)) continue;

    if (family === 'Noto Sans') {
      Font.register({
        family: 'Noto Sans',
        fonts: [
          { src: `${fontBase}/NotoSans-Regular.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
          { src: `${fontBase}/NotoSans-Bold.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
          { src: `${fontBase}/NotoSans-Italic.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
          { src: `${fontBase}/NotoSans-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
        ],
      });
    } else {
      Font.register({
        family: 'Noto Serif',
        fonts: [
          { src: `${fontBase}/NotoSerif-Regular.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
          { src: `${fontBase}/NotoSerif-Bold.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
          { src: `${fontBase}/NotoSerif-Italic.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
          { src: `${fontBase}/NotoSerif-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
        ],
      });
    }

    registeredFamilies.add(family);
  }
}
