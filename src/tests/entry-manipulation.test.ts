import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { ONE_PAGE_RESUME_FIXTURE } from '@/lib/fixtures/document-fixtures';
import { AtsSingleColumnTemplate } from '@/components/pdf/templates/AtsSingleColumn';
import { FullDocument } from '@/lib/documents/types';

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

describe('Entry-Level Manipulation: Hiding, Showing & Reordering', () => {
  it('hides an entry when isVisible is false and shows it when true', async () => {
    // Clone fixture and add two distinct experience entries
    const testDoc: FullDocument = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE));
    const expSec = testDoc.sections.find((s) => s.section_type === 'experience')!;
    (expSec.content as any).entries = [
      {
        id: 'exp-1',
        role: 'Visible Alpha Lead',
        organization: 'Alpha Corp',
        isVisible: true,
        bullets: ['Alpha achievement bullet.'],
      },
      {
        id: 'exp-2',
        role: 'Secret Beta Stealth Engineer',
        organization: 'Beta Labs',
        isVisible: false, // HIDDEN
        bullets: ['Beta classified bullet.'],
      },
    ];

    // Render with exp-2 hidden
    const textWithHidden = await extractText(
      React.createElement(AtsSingleColumnTemplate, {
        meta: testDoc.meta,
        sections: testDoc.sections,
      })
    );

    expect(textWithHidden).toContain('Visible Alpha Lead');
    expect(textWithHidden).toContain('Alpha achievement bullet.');
    expect(textWithHidden).not.toContain('Secret Beta Stealth Engineer');
    expect(textWithHidden).not.toContain('Beta classified bullet.');

    // Unhide exp-2
    (expSec.content as any).entries[1].isVisible = true;
    const textWithShown = await extractText(
      React.createElement(AtsSingleColumnTemplate, {
        meta: testDoc.meta,
        sections: testDoc.sections,
      })
    );

    expect(textWithShown).toContain('Visible Alpha Lead');
    expect(textWithShown).toContain('Secret Beta Stealth Engineer');
    expect(textWithShown).toContain('Beta classified bullet.');
  });

  it('reorders entries within a section and reflects in PDF reading order', async () => {
    const testDoc: FullDocument = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE));
    const expSec = testDoc.sections.find((s) => s.section_type === 'experience')!;
    (expSec.content as any).entries = [
      {
        id: 'exp-1',
        role: 'First Entry Architect',
        organization: 'First Org',
        isVisible: true,
      },
      {
        id: 'exp-2',
        role: 'Second Entry Director',
        organization: 'Second Org',
        isVisible: true,
      },
    ];

    // Initial order: First then Second
    const textInitial = await extractText(
      React.createElement(AtsSingleColumnTemplate, {
        meta: testDoc.meta,
        sections: testDoc.sections,
      })
    );
    const posFirst1 = textInitial.indexOf('First Entry Architect');
    const posSecond1 = textInitial.indexOf('Second Entry Director');
    expect(posFirst1).toBeGreaterThan(-1);
    expect(posSecond1).toBeGreaterThan(posFirst1);

    // Swap order: Second then First
    (expSec.content as any).entries = [
      (expSec.content as any).entries[1],
      (expSec.content as any).entries[0],
    ];

    const textSwapped = await extractText(
      React.createElement(AtsSingleColumnTemplate, {
        meta: testDoc.meta,
        sections: testDoc.sections,
      })
    );
    const posFirst2 = textSwapped.indexOf('First Entry Architect');
    const posSecond2 = textSwapped.indexOf('Second Entry Director');
    expect(posSecond2).toBeGreaterThan(-1);
    expect(posFirst2).toBeGreaterThan(posSecond2);
  });
});
