import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { STANDARD_FONT_DATA_URL } from './test-utils/pdfjs-node-setup';
import { EXTREME_EDGE_CASE_FIXTURE, UNBREAKABLE_TOKENS_FIXTURE } from '../lib/fixtures/document-fixtures';
import { AtsSingleColumnTemplate } from '../components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '../components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '../components/pdf/templates/AcademicCv';
import { TemplateId } from '../lib/documents/types';

async function extractHeaderLines(fixture: any, Component: React.ComponentType<any>): Promise<string[]> {
  const elem = React.createElement(Component, {
    meta: fixture.meta,
    sections: fixture.sections,
  });

  const blob = await pdf(elem as any).toBlob();
  const buffer = await blob.arrayBuffer();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const textContent = await page.getTextContent();

  // Extract items on page 1 that belong to header (y > 600 pt in typical A4 841pt)
  // Group by Y position to reconstruct exact visual lines
  const lineMap = new Map<number, Array<{ x: number; str: string }>>();
  for (const item of textContent.items as any[]) {
    if (!item.str || !item.str.trim()) continue;
    const y = item.transform[5];
    if (y < 600) continue; // Focus on header region
    // Round Y to nearest 2.5pt to group items on same line
    const yKey = Math.round(y / 2.5) * 2.5;
    if (!lineMap.has(yKey)) lineMap.set(yKey, []);
    lineMap.get(yKey)!.push({ x: item.transform[4], str: item.str });
  }

  // Sort by Y descending (top of page first)
  const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
  const lines: string[] = [];
  for (const y of sortedY) {
    const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
    lines.push(items.map((i) => i.str).join(' '));
  }

  return lines;
}

const templates: Array<{ id: TemplateId; Component: React.ComponentType<any> }> = [
  { id: 'ats_single_column', Component: AtsSingleColumnTemplate },
  { id: 'modern_professional', Component: ModernProfessionalTemplate },
  { id: 'academic_cv', Component: AcademicCvTemplate },
];

describe('Newline-Preserving Header Extraction and Break Verification', () => {
  for (const { id, Component } of templates) {
    it(`[${id}] extracts newline-preserving headers for EXTREME_EDGE_CASE_FIXTURE and verifies clean breaking`, async () => {
      const lines = await extractHeaderLines(EXTREME_EDGE_CASE_FIXTURE, Component);
      console.log(`\n=== [${id}] EXTREME_EDGE_CASE_FIXTURE EXTRACTED HEADERS ===`);
      console.log(lines.join('\n'));
      console.log(`=== END [${id}] ===\n`);

      expect(lines.length).toBeGreaterThan(0);
      const fullHeaderText = lines.join(' ');

      // Name should be present and intact
      expect(fullHeaderText).toContain('Alexander');
      expect(fullHeaderText).toContain('Montgomery-Chamberlain');

      // Check unbroken segments in URL
      expect(fullHeaderText).toContain('departments/');
      expect(fullHeaderText).toContain('directory/');
      expect(fullHeaderText).not.toContain('department s/');
      expect(fullHeaderText).not.toContain('director y/');
    });

    it(`[${id}] extracts newline-preserving headers for UNBREAKABLE_TOKENS_FIXTURE and verifies clean breaking`, async () => {
      const lines = await extractHeaderLines(UNBREAKABLE_TOKENS_FIXTURE, Component);
      console.log(`\n=== [${id}] UNBREAKABLE_TOKENS_FIXTURE EXTRACTED HEADERS ===`);
      console.log(lines.join('\n'));
      console.log(`=== END [${id}] ===\n`);

      expect(lines.length).toBeGreaterThan(0);
      const fullHeaderText = lines.join(' ');

      // Check name and headline are preserved
      expect(fullHeaderText).toContain('Nguyễn Thị Minh Khai');
      expect(fullHeaderText).toContain('Montgomery-Chamberlain');

      // Check unbroken segments in URL
      expect(fullHeaderText).toContain('faculty/');
      expect(fullHeaderText).toContain('profiles/');
      expect(fullHeaderText).toContain('overview/index');
    });
  }
});
