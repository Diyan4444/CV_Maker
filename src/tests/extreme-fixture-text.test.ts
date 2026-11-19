import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { EXTREME_EDGE_CASE_FIXTURE } from '@/lib/fixtures/document-fixtures';
import { AtsSingleColumnTemplate } from '@/components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '@/components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '@/components/pdf/templates/AcademicCv';

async function extractText(docElement: any): Promise<string> {
  const stream = await pdf(docElement).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text || '';
}

describe('Extreme Fixture Extracted PDF Text', () => {
  it('extracts text from all 3 templates for extreme edge case fixture', async () => {
    const atsText = await extractText(
      React.createElement(AtsSingleColumnTemplate, {
        meta: EXTREME_EDGE_CASE_FIXTURE.meta,
        sections: EXTREME_EDGE_CASE_FIXTURE.sections,
      })
    );
    console.log('=== ATS EXTREME EXTRACTED TEXT ===\n', atsText);
    expect(atsText).toContain('Dr. Alexander Bartholomew');
    expect(atsText).toContain('Ph.D., P.E., FIEEE');
    expect(atsText).toContain('Tromsø, Kraków, and České Budějovice');

    const modernText = await extractText(
      React.createElement(ModernProfessionalTemplate, {
        meta: EXTREME_EDGE_CASE_FIXTURE.meta,
        sections: EXTREME_EDGE_CASE_FIXTURE.sections,
      })
    );
    console.log('=== MODERN EXTREME EXTRACTED TEXT ===\n', modernText);
    expect(modernText).toContain('Dr. Alexander Bartholomew');

    const academicText = await extractText(
      React.createElement(AcademicCvTemplate, {
        meta: EXTREME_EDGE_CASE_FIXTURE.meta,
        sections: EXTREME_EDGE_CASE_FIXTURE.sections,
      })
    );
    console.log('=== ACADEMIC EXTREME EXTRACTED TEXT ===\n', academicText);
    expect(academicText).toContain('Dr. Alexander Bartholomew');
  });
});
