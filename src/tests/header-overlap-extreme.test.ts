import { describe, it, expect } from 'vitest';
import React from 'react';
import ReactPDF from '@react-pdf/renderer';
import { AtsSingleColumnTemplate } from '../components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '../components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '../components/pdf/templates/AcademicCv';
import { PDFParse } from 'pdf-parse';

const extremeHeaderMeta: any = {
  id: 'doc-extreme-header',
  title: 'Extreme Header Resume',
  type: 'resume',
  templateId: 'ats_single_column',
  accentColor: '#1A1A1A',
};

// Fixture with:
// - 80-char name
// - 300-char headline
// - 100-char city
// - 70-char email
// - 25-char phone
// - 150-char string without spaces in headline
const extremeHeaderSections: any[] = [
  {
    id: 'sec-header',
    sectionType: 'header',
    title: 'Header & Contact Information',
    orderIndex: 0,
    isVisible: true,
    content: {
      schema_version: '1.0.0',
      fullName: 'Maximilianus-Alexander Montgomery-Chamberlain von Hohenzollern-Sigmaringen-Saxe', // 80 chars
      headline: 'Distinguished Systems Architect & Lead Distributed Infrastructure Engineering Fellow SupercalifragilisticexpialidociousUnbreakableSuperLongStringWithoutAnySpaces1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ Leading Large Scale Computing Systems', // 300+ chars with 150-char token without spaces
      email: 'alexander.montgomery.chamberlain.von.hohenzollern.infrastructure@system.org', // 75 chars
      phone: '+1 (555) 019-2834-ext-9928', // 26 chars
      city: 'Township of Greater Metropolitan South San Francisco Regional Technology Hub & Computing District', // 99 chars
      country: 'CA',
    },
  },
  {
    id: 'sec-summary',
    sectionType: 'summary',
    title: 'Professional Summary',
    orderIndex: 1,
    isVisible: true,
    content: {
      schema_version: '1.0.0',
      text: 'Senior engineering leader with expertise in distributed consistency, zero-layout-shift UI systems, and extreme boundary testing.',
    },
  },
];

describe('Item 4: Header Overlap & Extreme Header Boundary Test', () => {
  it('AtsSingleColumn: renders extreme header without error, wrapping tokens properly', async () => {
    const stream = await ReactPDF.renderToStream(
      React.createElement(AtsSingleColumnTemplate, {
        meta: { ...extremeHeaderMeta, templateId: 'ats_single_column' },
        sections: extremeHeaderSections,
      }) as any
    );
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const pdfBuf = Buffer.concat(chunks);

    const parser = new PDFParse({ data: pdfBuf });
    const parsed = await parser.getText();
    expect(parsed.text).toContain('Maximilianus-Alexander');
    expect(parsed.text).toContain('Supercalifragilisticexpialidocious');
    expect(parsed.text).toContain('alexander.montgomery');
  });

  it('ModernProfessional: renders extreme header without error, wrapping tokens properly', async () => {
    const stream = await ReactPDF.renderToStream(
      React.createElement(ModernProfessionalTemplate, {
        meta: { ...extremeHeaderMeta, templateId: 'modern_professional' },
        sections: extremeHeaderSections,
      }) as any
    );
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const pdfBuf = Buffer.concat(chunks);

    const parser = new PDFParse({ data: pdfBuf });
    const parsed = await parser.getText();
    expect(parsed.text).toContain('Maximilianus-Alexander');
    expect(parsed.text).toContain('Supercalifragilisticexpialidocious');
  });

  it('AcademicCv: renders extreme header without error, wrapping tokens properly', async () => {
    const stream = await ReactPDF.renderToStream(
      React.createElement(AcademicCvTemplate, {
        meta: { ...extremeHeaderMeta, templateId: 'academic_cv' },
        sections: extremeHeaderSections,
      }) as any
    );
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const pdfBuf = Buffer.concat(chunks);

    const parser = new PDFParse({ data: pdfBuf });
    const parsed = await parser.getText();
    expect(parsed.text).toContain('Maximilianus-Alexander');
    expect(parsed.text).toContain('Supercalifragilisticexpialidocious');
  });
});
