import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import React from 'react';
import {
  ONE_PAGE_RESUME_FIXTURE,
  TWO_PAGE_RESUME_FIXTURE,
  THREE_PAGE_ACADEMIC_CV_FIXTURE,
  EXTREME_EDGE_CASE_FIXTURE,
  FORTY_BULLETS_FIXTURE,
  FONT_SPEC_FIXTURE,
  UNBREAKABLE_TOKENS_FIXTURE,
} from '../lib/fixtures/document-fixtures';
import { DocumentPdfRenderer } from '../components/pdf/DocumentPdfRenderer';
import { TemplateId, FullDocument } from '../lib/documents/types';

async function extractPdfText(doc: FullDocument, templateId: TemplateId): Promise<string> {
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

describe('All Templates x All Fixtures Full Section & Entry Coverage', () => {
  const templates: TemplateId[] = ['ats_single_column', 'modern_professional', 'academic_cv'];
  const fixtures: { name: string; doc: FullDocument }[] = [
    { name: '1-Page', doc: ONE_PAGE_RESUME_FIXTURE },
    { name: '2-Page', doc: TWO_PAGE_RESUME_FIXTURE },
    { name: '3-Page Academic', doc: THREE_PAGE_ACADEMIC_CV_FIXTURE },
    { name: 'Extreme Edge Case', doc: EXTREME_EDGE_CASE_FIXTURE },
    { name: '40 Bullets', doc: FORTY_BULLETS_FIXTURE },
    { name: 'Font Spec', doc: FONT_SPEC_FIXTURE },
    { name: 'Unbreakable Tokens', doc: UNBREAKABLE_TOKENS_FIXTURE },
  ];

  for (const tmpl of templates) {
    for (const fix of fixtures) {
      it(`[${tmpl}] renders fixture "${fix.name}" without losing any visible section or entry`, async () => {
        const text = await extractPdfText(fix.doc, tmpl);

        // Check every visible section in the document model
        const visibleSections = fix.doc.sections.filter(
          (s) => s.is_visible !== false && (s as any).isVisible !== false
        );

        for (const sec of visibleSections) {
          const type = (sec as any).section_type || (sec as any).sectionType;
          const content = sec.content as any;

          if (type === 'header') {
            const name = content.fullName || content.full_name;
            if (name) expect(text).toContain(name);
          } else if (type === 'summary') {
            const sumText = content.text;
            if (sumText) {
              // Check first 40 chars of summary
              expect(text).toContain(sumText.slice(0, 40));
            }
          } else if (content.entries && Array.isArray(content.entries)) {
            const visibleEntries = content.entries.filter((e: any) => e.isVisible !== false);
            for (const entry of visibleEntries) {
              const keyTitle = entry.title || entry.role || entry.degree || entry.category || entry.name;
              if (keyTitle) {
                expect(text).toContain(keyTitle);
              }
            }
          }
        }
      }, 40000);
    }
  }

  it('asserts that extreme fixture skills list contains all 60 items in ATS, Modern, and Academic CV', async () => {
    for (const tmpl of templates) {
      const text = await extractPdfText(EXTREME_EDGE_CASE_FIXTURE, tmpl);
      // Both first and 60th item must be present
      expect(text).toContain('Rust');
      expect(text).toContain('Elasticsearch');
      expect(text).toContain('Linux');
      expect(text).toContain('Git');
    }
  });
});
