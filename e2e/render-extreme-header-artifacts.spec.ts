import { test, expect } from '@playwright/test';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import fs from 'node:fs';
import path from 'node:path';
import { AtsSingleColumnTemplate } from '../src/components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '../src/components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '../src/components/pdf/templates/AcademicCv';
import { TemplateId } from '../src/lib/documents/types';

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity', 'brain', '0476a383-8a86-41cb-a552-ce7ab883faf8');

const EXACT_80_CHAR_NAME = 'Prof. Dr. Maximilian Alexander Montgomery-Chamberlain-Fitzgerald-Smithington III';
const EXACT_300_CHAR_HEADLINE =
  'SupercalifragilisticexpialidociousUnbreakableContinuousStringForLayoutTestingWithNoSpacesHyphensOrDelimitersToEnsureTextWrapNeverBreaksTokensIncorrect' +
  ' Distinguished Systems Architecture & Scalable Cloud Research Group Lead At Cambridge Center XXXXXXXXXXXXXXXXXXXXXXXXXXX' +
  '123456789012345678901234567890';
const EXACT_100_CHAR_CITY = 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch-ExtraLongMetropolitanCityDistrictDivision';
const EXACT_70_CHAR_EMAIL = 'alexander.montgomery-chamberlain.distinguished.chair@research-inst.ac.';
const EXACT_25_CHAR_PHONE = '+1 (555) 019-283401928340';

const extremeHeaderMeta: any = {
  id: 'doc-extreme-header',
  title: 'Extreme Header Resume',
  type: 'resume',
  accentColor: '#1A1A1A',
};

const extremeHeaderSections: any[] = [
  {
    id: 'sec-header',
    sectionType: 'header',
    title: 'Header & Contact Information',
    orderIndex: 0,
    isVisible: true,
    content: {
      schema_version: '1.0.0',
      fullName: EXACT_80_CHAR_NAME,
      headline: EXACT_300_CHAR_HEADLINE,
      email: EXACT_70_CHAR_EMAIL,
      phone: EXACT_25_CHAR_PHONE,
      city: EXACT_100_CHAR_CITY,
      country: 'UK',
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
      text: 'Senior engineering leader with expertise in distributed consistency, zero-layout-shift UI systems, and extreme boundary testing under high concurrency and stress workloads.',
    },
  },
];

test('Render PNG artifacts for extreme header across all three templates', async () => {
  const templates: Array<{ id: TemplateId; Component: React.ComponentType<any> }> = [
    { id: 'ats_single_column', Component: AtsSingleColumnTemplate },
    { id: 'modern_professional', Component: ModernProfessionalTemplate },
    { id: 'academic_cv', Component: AcademicCvTemplate },
  ];

  for (const { id, Component } of templates) {
    const docElement = React.createElement(Component, {
      meta: { ...extremeHeaderMeta, templateId: id },
      sections: extremeHeaderSections,
    });

    const blob = await pdf(docElement as any).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    const screens = await parser.getScreenshot({ scale: 2.0, imageBuffer: true });
    await parser.destroy();

    const outPath = path.join(ARTIFACT_DIR, `extreme_header_${id}.png`);
    fs.writeFileSync(outPath, Buffer.from(screens.pages[0].data));
    console.log(`[PNG Artifact] Generated: ${outPath} (${screens.pages[0].data.length} bytes)`);
    expect(fs.existsSync(outPath)).toBe(true);
  }
});
