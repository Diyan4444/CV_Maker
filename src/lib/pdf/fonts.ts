import { Font } from '@react-pdf/renderer';
import path from 'node:path';

let fontsRegistered = false;

export function registerNotoFonts() {
  if (fontsRegistered) return;

  const isBrowser = typeof window !== 'undefined';
  const fontBase = isBrowser ? '/fonts' : path.resolve(process.cwd(), 'public/fonts');

  // Disable automatic hyphenation across all templates and preview (registered once)
  Font.registerHyphenationCallback((word) => [word]);

  Font.register({
    family: 'Noto Sans',
    fonts: [
      { src: `${fontBase}/NotoSans-Regular.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
      { src: `${fontBase}/NotoSans-Bold.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
      { src: `${fontBase}/NotoSans-Italic.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
      { src: `${fontBase}/NotoSans-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: 'Noto Serif',
    fonts: [
      { src: `${fontBase}/NotoSerif-Regular.ttf`, fontWeight: 'normal', fontStyle: 'normal' },
      { src: `${fontBase}/NotoSerif-Bold.ttf`, fontWeight: 'bold', fontStyle: 'normal' },
      { src: `${fontBase}/NotoSerif-Italic.ttf`, fontWeight: 'normal', fontStyle: 'italic' },
      { src: `${fontBase}/NotoSerif-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
    ],
  });

  fontsRegistered = true;
}
