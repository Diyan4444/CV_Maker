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

const ARTIFACT_DIR = 'C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8';

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
      fullName: 'Maximilianus-Alexander Montgomery-Chamberlain von Hohenzollern-Sigmaringen-Saxe',
      headline: 'Distinguished Systems Architect & Lead Distributed Infrastructure Engineering Fellow SupercalifragilisticexpialidociousUnbreakableSixtyCharWord Leading Large Scale Computing Systems',
      email: 'alexander.montgomery.chamberlain.von.hohenzollern.infrastructure@system.org',
      phone: '+1 (555) 019-2834-ext-9928',
      city: 'Township of Greater Metropolitan South San Francisco Regional Technology Hub & Computing District',
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
