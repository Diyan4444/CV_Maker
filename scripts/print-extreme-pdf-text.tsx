import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { EXTREME_EDGE_CASE_FIXTURE } from '../src/lib/fixtures/document-fixtures';
import { AtsSingleColumnTemplate } from '../src/components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '../src/components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '../src/components/pdf/templates/AcademicCv';

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

async function main() {
  console.log('=== EXTRACTING PDF TEXT FROM EXTREME FIXTURE ACROSS ALL 3 TEMPLATES ===\n');

  console.log('---------------------------------------------------------');
  console.log('1. TEMPLATE: AtsSingleColumn');
  console.log('---------------------------------------------------------');
  const atsText = await extractText(
    <AtsSingleColumnTemplate
      meta={EXTREME_EDGE_CASE_FIXTURE.meta}
      sections={EXTREME_EDGE_CASE_FIXTURE.sections}
    />
  );
  console.log(atsText);

  console.log('\n---------------------------------------------------------');
  console.log('2. TEMPLATE: ModernProfessional');
  console.log('---------------------------------------------------------');
  const modernText = await extractText(
    <ModernProfessionalTemplate
      meta={EXTREME_EDGE_CASE_FIXTURE.meta}
      sections={EXTREME_EDGE_CASE_FIXTURE.sections}
    />
  );
  console.log(modernText);

  console.log('\n---------------------------------------------------------');
  console.log('3. TEMPLATE: AcademicCv');
  console.log('---------------------------------------------------------');
  const academicText = await extractText(
    <AcademicCvTemplate
      meta={EXTREME_EDGE_CASE_FIXTURE.meta}
      sections={EXTREME_EDGE_CASE_FIXTURE.sections}
    />
  );
  console.log(academicText);
}

main().catch(console.error);
