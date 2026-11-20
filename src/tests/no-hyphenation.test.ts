import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import React from 'react';
import { EXTREME_EDGE_CASE_FIXTURE, UNBREAKABLE_TOKENS_FIXTURE } from '../lib/fixtures/document-fixtures';
import { DocumentPdfRenderer } from '../components/pdf/DocumentPdfRenderer';
import { TemplateId } from '../lib/documents/types';

async function extractFullText(doc: any, templateId: TemplateId): Promise<string> {
  const renderedDoc = {
    ...doc,
    meta: {
      ...doc.meta,
      template_id: templateId,
    },
  };

  const docElement = React.createElement(DocumentPdfRenderer, {
    meta: renderedDoc.meta,
    sections: renderedDoc.sections,
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
    fullText += ' ' + pageStrings.join(' ');
  }

  return fullText.replace(/\s+/g, ' ').trim();
}

describe('Hyphenation Artifacts & Unbreakable Tokens Verification', () => {
  const templates: TemplateId[] = ['ats_single_column', 'modern_professional', 'academic_cv'];

  for (const tid of templates) {
    it(`[${tid}] extreme fixture has no broken hyphenated words and preserves all keywords`, async () => {
      const text = await extractFullText(EXTREME_EDGE_CASE_FIXTURE, tid);

      // Verify words that previously split with inserted hyphens are now completely intact
      expect(text).toContain('Mitterrand');
      expect(text).not.toContain('Mitter- rand');

      expect(text).toContain('geographic');
      expect(text).not.toContain('geo- graphic');

      expect(text).toContain('simulations');
      expect(text).not.toContain('simula- tions');

      expect(text).toContain('microarchitecture');

      // Assert that no inserted hyphen split pattern (\w- \w) appears that is not in source
      // The only allowed hyphens with spaces are typographical dashes (" – ", " — ")
      const insertedHyphenMatches = text.match(/[a-zA-Z]- [a-zA-Z]/g) || [];
      expect(insertedHyphenMatches, `Found inserted hyphen artifacts: ${insertedHyphenMatches.join(', ')}`).toEqual([]);
    }, 30000);

    it(`[${tid}] unbreakable tokens fixture preserves 70-char email, 120-char URL, and names intact`, async () => {
      const text = await extractFullText(UNBREAKABLE_TOKENS_FIXTURE, tid);

      // 1. Assert names appear intact
      expect(text).toContain('Nguyễn Thị Minh Khai');
      expect(text).toContain('Montgomery-Chamberlain');

      // 2. Assert 70-char email appears intact
      const expectedEmail = 'nguyen.thi.minh.khai.fellow.director@institution-subdomain.domain.org';
      expect(text).toContain(expectedEmail);

      // 3. Assert 120-char URL domain & path appear intact
      const expectedUrlPath = 'institution-subdomain.domain.org/research/faculty/profiles/nguyen-thi-minh-khai-montgomery-chamberlain/overview/index';
      expect(text).toContain(expectedUrlPath);

      // 4. Assert no inserted hyphen-space artifact (\w- \w) appears
      const insertedHyphenMatches = text.match(/[a-zA-Z]- [a-zA-Z]/g) || [];
      expect(insertedHyphenMatches, `Found inserted hyphen artifacts: ${insertedHyphenMatches.join(', ')}`).toEqual([]);
    }, 30000);
  }
});
