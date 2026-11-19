import { describe, it } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { EXTREME_EDGE_CASE_FIXTURE } from '../lib/fixtures/document-fixtures';
import { DocumentPdfRenderer } from '../components/pdf/DocumentPdfRenderer';
import { TemplateId } from '../lib/documents/types';

async function extractFullText(templateId: TemplateId): Promise<{ pageCount: number; text: string }> {
  const doc = {
    ...EXTREME_EDGE_CASE_FIXTURE,
    meta: {
      ...EXTREME_EDGE_CASE_FIXTURE.meta,
      template_id: templateId,
    },
  };

  const docElement = React.createElement(DocumentPdfRenderer, {
    meta: doc.meta,
    sections: doc.sections,
  }) as any;

  const blob = await pdf(docElement).toBlob();
  const buffer = await blob.arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  let fullText = '';
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const pageStrings = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str);
    fullText += `\n--- [PAGE ${i} of ${pdfDoc.numPages}] ---\n` + pageStrings.join(' ');
  }

  return { pageCount: pdfDoc.numPages, text: fullText.trim() };
}

describe('Extract Extreme Fixture Text', () => {
  it('extracts full text for ATS, Modern, and Academic templates', async () => {
    const templates: TemplateId[] = ['ats_single_column', 'modern_professional', 'academic_cv'];
    let output = '';

    for (const tid of templates) {
      const result = await extractFullText(tid);
      const section = `\n=======================================================\nEXTREME FIXTURE EXTRACTED TEXT: ${tid.toUpperCase()} (${result.pageCount} Pages)\n=======================================================\n${result.text}\n`;
      output += section;
      console.log(section);
    }

    fs.writeFileSync(path.resolve(__dirname, '../../extreme_extracted_text.txt'), output, 'utf8');
  }, 60000);
});
