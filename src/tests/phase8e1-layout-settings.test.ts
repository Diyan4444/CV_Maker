import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { LayoutSettingsSchema, documentMetaSchema } from '@/lib/documents/schemas';
import { resolvePdfLayout, getTemplateLayoutDefaults } from '@/lib/pdf/layout-settings';
import { registerNotoFonts } from '@/lib/pdf/fonts';
import { DocumentPdfRenderer } from '@/components/pdf/DocumentPdfRenderer';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';

function makeFixtureDoc(overrides?: Partial<DocumentMeta>): {
  meta: DocumentMeta;
  sections: DocumentSection[];
} {
  const meta: DocumentMeta = {
    id: 'doc-8e1-test',
    userId: 'user-8e1-test',
    title: 'Senior Software Engineer Resume',
    type: 'resume',
    templateId: 'ats_single_column',
    status: 'draft',
    accentColor: '#800021',
    targetRole: 'Staff Engineer',
    targetCompany: 'Example Corp',
    version: 1,
    schemaVersion: '1.0.0',
    ...overrides,
  };

  const sections: DocumentSection[] = [
    {
      id: 'sec-header',
      documentId: meta.id,
      sectionType: 'header',
      title: 'Header',
      orderIndex: 0,
      isVisible: true,
      content: {
        fullName: 'Ada Lovelace',
        headline: 'Principal Systems Architect',
        email: 'ada@example.com',
        phone: '+1 555-0100',
        location: 'London, UK',
        links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
      },
    },
    {
      id: 'sec-summary',
      documentId: meta.id,
      sectionType: 'summary',
      title: 'Professional Summary',
      orderIndex: 1,
      isVisible: true,
      content: {
        text: 'Distributed systems engineer with 10 years of experience building low-latency data pipelines and resilient cloud infrastructure.',
      },
    },
    {
      id: 'sec-exp',
      documentId: meta.id,
      sectionType: 'experience',
      title: 'Experience',
      orderIndex: 2,
      isVisible: true,
      content: {
        entries: [
          {
            id: 'exp-1',
            type: 'work',
            role: 'Staff Software Engineer',
            organization: 'Analytical Engines Ltd',
            location: 'London',
            startDate: '2021-01',
            endDate: '',
            isCurrent: true,
            bullets: [
              'Architected event-driven ingestion pipeline handling 120k events per second with 99.99% availability.',
              'Reduced p99 query latency by 42% through adaptive partitioning and index compression.',
            ],
          },
          {
            id: 'exp-2',
            type: 'work',
            role: 'Senior Engineer',
            organization: 'Babbage Cloud',
            location: 'Remote',
            startDate: '2018-03',
            endDate: '2020-12',
            isCurrent: false,
            bullets: [
              'Led migration from monolithic SQL cluster to sharded PostgreSQL with zero downtime.',
            ],
          },
        ],
      },
    },
    {
      id: 'sec-skills',
      documentId: meta.id,
      sectionType: 'skills',
      title: 'Technical Skills',
      orderIndex: 3,
      isVisible: true,
      content: {
        entries: [
          {
            id: 'sk-1',
            category: 'Languages & Systems',
            items: ['TypeScript', 'Rust', 'PostgreSQL', 'Kubernetes'],
          },
        ],
      },
    },
  ];

  return { meta, sections };
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; numpages: number }> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  const numpages = result.total;
  const text = result.text;
  await parser.destroy();
  return { text, numpages };
}

async function renderPdf(meta: DocumentMeta, sections: DocumentSection[]): Promise<Buffer> {
  return renderToBuffer(
    React.createElement(DocumentPdfRenderer, { meta, sections }) as unknown as Parameters<
      typeof renderToBuffer
    >[0]
  );
}

describe('Phase 8E-1 Layout Settings & PDF Parity', () => {
  beforeAll(() => {
    registerNotoFonts();
  });

  it('validates allowed LayoutSettings ranges and steps', () => {
    expect(
      LayoutSettingsSchema.safeParse({
        fontFamily: 'Noto Serif',
        fontSize: 10.5,
        lineHeight: 1.45,
        pageMargin: 36,
        underlineLinks: false,
        pageNumbers: true,
      }).success
    ).toBe(true);

    expect(LayoutSettingsSchema.safeParse({}).success).toBe(true);
    expect(
      documentMetaSchema.safeParse({
        id: 'doc-1',
        user_id: 'user-1',
        type: 'resume',
        title: 'Test',
        template_id: 'ats_single_column',
        accent_color: '#0B0B0B',
        version: 1,
      }).success
    ).toBe(true);
  });

  it('rejects out-of-range, off-step, invalid font, and oversized layoutSettings', () => {
    expect(LayoutSettingsSchema.safeParse({ fontFamily: 'Arial' }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ fontSize: 8 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ fontSize: 9.2 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ fontSize: 12.5 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ lineHeight: 1.1 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ lineHeight: 1.33 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ lineHeight: 1.65 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ pageMargin: 22 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ pageMargin: 25 }).success).toBe(false);
    expect(LayoutSettingsSchema.safeParse({ pageMargin: 58 }).success).toBe(false);
    expect(
      LayoutSettingsSchema.safeParse({
        fontFamily: 'Noto Sans',
        extra: 'x'.repeat(2050),
      }).success
    ).toBe(false);
  });

  it('resolves template defaults identically to pre-8E1 template values', () => {
    const ats = getTemplateLayoutDefaults('ats_single_column');
    expect(ats).toMatchObject({
      fontFamily: 'Noto Sans',
      fontSize: 9.5,
      fontScale: 1,
      lineHeight: 1.35,
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 40,
      underlineLinks: true,
      pageNumbers: false,
    });

    const academic = getTemplateLayoutDefaults('academic_cv');
    expect(academic).toMatchObject({
      fontFamily: 'Noto Serif',
      fontSize: 9.5,
      fontScale: 1,
      lineHeight: 1.4,
      paddingTop: 40,
      paddingBottom: 40,
      paddingHorizontal: 44,
      underlineLinks: true,
      pageNumbers: false,
    });

    expect(resolvePdfLayout('ats_single_column', {})).toEqual(ats);
  });

  it('produces identical PDF text and page count for undefined vs empty layoutSettings', async () => {
    const docDefault = makeFixtureDoc({ layoutSettings: undefined });
    const docEmpty = makeFixtureDoc({ layoutSettings: {} });

    const buf1 = await renderPdf(docDefault.meta, docDefault.sections);
    const buf2 = await renderPdf(docEmpty.meta, docEmpty.sections);

    const parsed1 = await extractPdfText(buf1);
    const parsed2 = await extractPdfText(buf2);

    expect(parsed1.numpages).toBe(parsed2.numpages);
    expect(parsed1.text).toBe(parsed2.text);
  });

  it('renders pageNumbers footer and responds to fontFamily, pageMargin, and underlineLinks', async () => {
    const baseDoc = makeFixtureDoc();
    const baseBuf = await renderPdf(baseDoc.meta, baseDoc.sections);

    const numberedDoc = makeFixtureDoc({
      layoutSettings: { pageNumbers: true },
    });
    const numberedBuf = await renderPdf(numberedDoc.meta, numberedDoc.sections);
    const numberedParsed = await extractPdfText(numberedBuf);
    expect(numberedParsed.text).toContain('1 / 1');

    const serifDoc = makeFixtureDoc({
      layoutSettings: { fontFamily: 'Noto Serif' },
    });
    const serifBuf = await renderPdf(serifDoc.meta, serifDoc.sections);
    expect(Buffer.compare(baseBuf, serifBuf)).not.toBe(0);

    const noUnderlineDoc = makeFixtureDoc({
      layoutSettings: { underlineLinks: false },
    });
    const noUnderlineBuf = await renderPdf(noUnderlineDoc.meta, noUnderlineDoc.sections);
    expect(Buffer.compare(baseBuf, noUnderlineBuf)).not.toBe(0);

    // Extreme settings: narrow margin 24pt + large font 12pt + pageNumbers
    const extremeDoc = makeFixtureDoc({
      layoutSettings: {
        fontFamily: 'Noto Serif',
        fontSize: 12,
        lineHeight: 1.5,
        pageMargin: 24,
        underlineLinks: true,
        pageNumbers: true,
      },
    });
    const extremeBuf = await renderPdf(extremeDoc.meta, extremeDoc.sections);
    const extremeParsed = await extractPdfText(extremeBuf);

    // ATS reading order preserved
    const summaryIdx = extremeParsed.text.indexOf('PROFESSIONAL SUMMARY');
    const expIdx = extremeParsed.text.indexOf('EXPERIENCE');
    const skillsIdx = extremeParsed.text.indexOf('TECHNICAL SKILLS');
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(expIdx).toBeGreaterThan(summaryIdx);
    expect(skillsIdx).toBeGreaterThan(expIdx);
  });
});
