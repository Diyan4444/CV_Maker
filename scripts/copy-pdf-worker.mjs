import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destDir = path.resolve(process.cwd(), 'public');
const dest = path.join(destDir, 'pdf.worker.min.mjs');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('[copy-pdf-worker] Successfully copied pdf.worker.min.mjs to public/');
  } else {
    console.warn(`[copy-pdf-worker] Warning: ${src} not found, skipping copy.`);
  }
} catch (err) {
  console.error('[copy-pdf-worker] Error copying pdf.worker.min.mjs:', err);
  process.exit(1);
}
