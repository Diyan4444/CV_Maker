import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { FORTY_BULLETS_FIXTURE } from '@/lib/fixtures/document-fixtures';
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

describe('Multi-Page Flow and 40-Bullet Fixture Verification', () => {
  it('renders AtsSingleColumn without clipping 40 bullets or 600ch bullet across page boundaries', async () => {
    const rawText = await extractText(
      React.createElement(AtsSingleColumnTemplate, {
        meta: FORTY_BULLETS_FIXTURE.meta,
        sections: FORTY_BULLETS_FIXTURE.sections,
      })
    );
    const text = rawText.replace(/\s+/g, ' ');

    // Verify first, middle, 600-character bullet, and last bullet are present
    expect(text).toContain('Bullet 1:');
    expect(text).toContain('Bullet 20 (600+ characters):');
    expect(text).toContain('Byzantine-fault-tolerant consensus mechanism');
    expect(text).toContain('fourteen days without a single state anomaly');
    expect(text).toContain('Bullet 40:');
  });

  it('renders ModernProfessional without clipping 40 bullets or 600ch bullet across page boundaries', async () => {
    const rawText = await extractText(
      React.createElement(ModernProfessionalTemplate, {
        meta: FORTY_BULLETS_FIXTURE.meta,
        sections: FORTY_BULLETS_FIXTURE.sections,
      })
    );
    const text = rawText.replace(/\s+/g, ' ');

    expect(text).toContain('Bullet 1:');
    expect(text).toContain('Bullet 20 (600+ characters):');
    expect(text).toContain('Byzantine-fault-tolerant consensus mechanism');
    expect(text).toContain('fourteen days without a single state anomaly');
    expect(text).toContain('Bullet 40:');
  });

  it('renders AcademicCv without clipping 40 bullets or 600ch bullet across page boundaries', async () => {
    const rawText = await extractText(
      React.createElement(AcademicCvTemplate, {
        meta: FORTY_BULLETS_FIXTURE.meta,
        sections: FORTY_BULLETS_FIXTURE.sections,
      })
    );
    const text = rawText.replace(/\s+/g, ' ');

    expect(text).toContain('Bullet 1:');
    expect(text).toContain('Bullet 20 (600+ characters):');
    expect(text).toContain('Byzantine-fault-tolerant consensus mechanism');
    expect(text).toContain('fourteen days without a single state anomaly');
    expect(text).toContain('Bullet 40:');
  });
});
