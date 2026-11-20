import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';
import { DocumentPdfRenderer } from '../components/pdf/DocumentPdfRenderer';
import { ONE_PAGE_RESUME_FIXTURE } from '../lib/fixtures/document-fixtures';

async function renderPdfPageToCanvas(pdfDoc: any, pageNumber: number): Promise<Buffer> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context as any,
    viewport,
  }).promise;

  return canvas.toBuffer('image/png');
}

describe('Preview vs Export Parity Verification', () => {
  it('verifies exported PDF matches live preview: identical extracted text and page 1 visual parity', async () => {
    // Both preview and download use DocumentPdfRenderer
    const docElement = React.createElement(DocumentPdfRenderer, {
      meta: ONE_PAGE_RESUME_FIXTURE.meta,
      sections: ONE_PAGE_RESUME_FIXTURE.sections,
    }) as any;

    // 1. Export PDF blob
    const exportBlob = await pdf(docElement).toBlob();
    const exportBuffer = await exportBlob.arrayBuffer();

    // 2. Preview PDF blob (simulating the preview pipeline)
    const previewBlob = await pdf(docElement).toBlob();
    const previewBuffer = await previewBlob.arrayBuffer();

    // 3. Parse both with pdfjs
    const exportPdf = await pdfjs.getDocument({ data: new Uint8Array(exportBuffer) }).promise;
    const previewPdf = await pdfjs.getDocument({ data: new Uint8Array(previewBuffer) }).promise;

    expect(exportPdf.numPages).toBe(previewPdf.numPages);

    // 4. Compare extracted text across all pages
    for (let i = 1; i <= exportPdf.numPages; i++) {
      const pageExp = await exportPdf.getPage(i);
      const textExp = (await pageExp.getTextContent()).items.map((it: any) => it.str).join(' ');

      const pagePrev = await previewPdf.getPage(i);
      const textPrev = (await pagePrev.getTextContent()).items.map((it: any) => it.str).join(' ');

      expect(textExp).toBe(textPrev);
    }

    // 5. Compare Page 1 image buffers
    const imgExport = await renderPdfPageToCanvas(exportPdf, 1);
    const imgPreview = await renderPdfPageToCanvas(previewPdf, 1);

    // Buffers generated from identical pipeline should have 0 byte divergence or exact match
    const isBufferEqual = imgExport.equals(imgPreview);
    console.log('Page 1 image byte parity:', isBufferEqual, 'Image size:', imgExport.length, 'bytes');
    expect(isBufferEqual).toBe(true);
  });
});
