import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { DocumentPdfRenderer } from '../components/pdf/DocumentPdfRenderer';
import { ONE_PAGE_RESUME_FIXTURE } from '../lib/fixtures/document-fixtures';
import { PRODUCT_NAME } from '../config/app';

describe('PDF Metadata Generation and Extraction', () => {
  it('embeds Title, Author, Subject, Creator, Producer and Keywords in generated PDF', async () => {
    const docElement = React.createElement(DocumentPdfRenderer, {
      meta: ONE_PAGE_RESUME_FIXTURE.meta,
      sections: ONE_PAGE_RESUME_FIXTURE.sections,
    }) as any;

    const blob = await pdf(docElement).toBlob();
    const buffer = await blob.arrayBuffer();

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;
    const metadata = (await pdfDoc.getMetadata()) as { info: Record<string, any> };
    const info = metadata.info;

    console.log('Extracted PDF Metadata info:', JSON.stringify(info, null, 2));

    expect(info.Title).toBe(ONE_PAGE_RESUME_FIXTURE.meta.title);
    expect(info.Author).toBe('Diyan Shah');
    expect(info.Subject).toBe(ONE_PAGE_RESUME_FIXTURE.meta.target_role);
    expect(info.Creator).toBe(PRODUCT_NAME);
    expect(info.Producer).toBe(`${PRODUCT_NAME} (react-pdf)`);
    expect(info.Keywords).toBe('resume');
  });
});
