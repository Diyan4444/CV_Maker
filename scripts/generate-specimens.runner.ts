import { test, expect } from '@playwright/test';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import fs from 'node:fs';
import path from 'node:path';
import { AtsSingleColumnTemplate } from '../src/components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '../src/components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '../src/components/pdf/templates/AcademicCv';
import { ONE_PAGE_RESUME_FIXTURE } from '../src/lib/fixtures/document-fixtures';
import { TemplateId } from '../src/lib/documents/types';

const PUBLIC_LANDING_DIR = path.join(process.cwd(), 'public', 'landing');

test('Generate landing page specimens from real templates under 150KB', async () => {
  if (!fs.existsSync(PUBLIC_LANDING_DIR)) {
    fs.mkdirSync(PUBLIC_LANDING_DIR, { recursive: true });
  }

  const templates: Array<{ id: TemplateId; filename: string; Component: React.ComponentType<any> }> = [
    { id: 'ats_single_column', filename: 'ats_single_column.png', Component: AtsSingleColumnTemplate },
    { id: 'modern_professional', filename: 'modern_professional.png', Component: ModernProfessionalTemplate },
    { id: 'academic_cv', filename: 'academic_cv.png', Component: AcademicCvTemplate },
  ];

  for (const { id, filename, Component } of templates) {
    const meta = {
      ...ONE_PAGE_RESUME_FIXTURE.meta,
      template_id: id,
      title: 'Alex Example Resume',
      accent_color: id === 'modern_professional' ? '#800021' : '#0B0B0B',
    };

    const docElement = React.createElement(Component, {
      meta,
      sections: ONE_PAGE_RESUME_FIXTURE.sections,
    });

    const blob = await pdf(docElement as any).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Render page 1 at scale 1.0 to keep crispness while staying well under 150 KB
    const parser = new PDFParse({ data: buffer });
    const screens = await parser.getScreenshot({ scale: 1.0, imageBuffer: true });
    await parser.destroy();

    const outPath = path.join(PUBLIC_LANDING_DIR, filename);
    const pngBuffer = Buffer.from(screens.pages[0].data);
    fs.writeFileSync(outPath, pngBuffer);

    const sizeKb = Math.round((pngBuffer.length / 1024) * 10) / 10;
    console.log(`[Specimen Generated] ${filename}: ${pngBuffer.length} bytes (${sizeKb} KB)`);
    expect(fs.existsSync(outPath)).toBe(true);
    expect(pngBuffer.length).toBeLessThan(150 * 1024);
  }
});
