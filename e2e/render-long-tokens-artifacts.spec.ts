import { test, expect } from '@playwright/test';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import fs from 'node:fs';
import path from 'node:path';
import { AtsSingleColumnTemplate } from '../src/components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '../src/components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '../src/components/pdf/templates/AcademicCv';
import { DocumentSection, TemplateId } from '../src/lib/documents/types';

const ARTIFACT_DIR =
  process.env.ARTIFACT_DIR ||
  path.join(process.env.USERPROFILE || process.env.HOME || '', '.gemini', 'antigravity', 'brain', '0476a383-8a86-41cb-a552-ce7ab883faf8');

// Exactly 120 characters, hyphen-free, with natural '/' break opportunities
const EXACT_120_CHAR_URL =
  'https://example.com/department/computational/biophysics/spectrometry/molecular/genomics/neuroscience/quantum/algorithm/v';

// Exactly 90 characters
const EXACT_90_CHAR_EMAIL =
  'alexander.montgomery.chamberlain.systems.fellow@subdomain.institute.advanced.studies.ac.uk';

// Exactly 70 characters
const EXACT_70_CHAR_EMAIL =
  'alexander.montgomery.chamberlain@cambridge.theoretical.physics.dept.ac';

const longTokenMeta = {
  id: 'doc-long-tokens',
  title: 'Long Tokens Test Document',
  slug: 'long-tokens-test-document',
  target_role: 'Distinguished Systems Architect',
  type: 'resume',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const longTokenSections: DocumentSection[] = [
  {
    id: 'sec-header',
    document_id: 'doc-long-tokens',
    section_type: 'header',
    title: 'Header',
    custom_title: null,
    section_order: 0,
    is_visible: true,
    content: {
      fullName: 'Alex Example',
      headline: 'Distinguished Systems Architect & Theoretical Computing Chair',
      email: EXACT_90_CHAR_EMAIL,
      phone: '+1 (555) 019-2834',
      location: 'Cambridge, MA, USA',
      links: [
        { label: EXACT_120_CHAR_URL, url: EXACT_120_CHAR_URL },
        { label: EXACT_70_CHAR_EMAIL, url: `mailto:${EXACT_70_CHAR_EMAIL}` },
      ],
    },
  },
  {
    id: 'sec-summary',
    document_id: 'doc-long-tokens',
    section_type: 'summary',
    title: 'Summary',
    custom_title: null,
    section_order: 1,
    is_visible: true,
    content: {
      text: 'Senior researcher and systems architect specializing in high-performance distributed architectures.',
    },
  },
  {
    id: 'sec-experience',
    document_id: 'doc-long-tokens',
    section_type: 'experience',
    title: 'Experience',
    custom_title: null,
    section_order: 2,
    is_visible: true,
    content: {
      entries: [
        {
          id: 'exp-1',
          title: 'Principal Research Fellow',
          company: 'Cambridge Advanced Systems Laboratory',
          date: '2020 - Present',
          description: 'Leading foundational engineering across scalable distributed clusters.',
        },
      ],
    },
  },
];

test('Render PNG artifacts for long URLs and emails across all three templates', async () => {
  const templates: Array<{ id: TemplateId; Component: React.ComponentType<any> }> = [
    { id: 'ats_single_column', Component: AtsSingleColumnTemplate },
    { id: 'modern_professional', Component: ModernProfessionalTemplate },
    { id: 'academic_cv', Component: AcademicCvTemplate },
  ];

  for (const { id, Component } of templates) {
    const docElement = React.createElement(Component, {
      meta: { ...longTokenMeta, templateId: id },
      sections: longTokenSections,
    });

    const blob = await pdf(docElement as any).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parser = new PDFParse({ data: buffer });
    const screens = await parser.getScreenshot({ scale: 2.0, imageBuffer: true });
    await parser.destroy();

    const outPath = path.join(ARTIFACT_DIR, `long_tokens_${id}.png`);
    fs.writeFileSync(outPath, Buffer.from(screens.pages[0].data));
    console.log(`[PNG Artifact] Generated: ${outPath} (${screens.pages[0].data.length} bytes)`);
    expect(fs.existsSync(outPath)).toBe(true);
  }
});
