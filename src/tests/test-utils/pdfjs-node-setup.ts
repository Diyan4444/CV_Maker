import path from 'node:path';

// Standard fonts directory for pdfjs with required trailing forward slash
export const STANDARD_FONT_DATA_URL =
  path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts').replace(/\\/g, '/') + '/';
