import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { DocumentPdfRenderer } from '../components/pdf/DocumentPdfRenderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TemplateId } from '../lib/documents/types';

const EXACT_80_CHAR_NAME = 'Prof. Dr. Maximilian Alexander Montgomery-Chamberlain-Fitzgerald-Smithington III';
const EXACT_300_CHAR_HEADLINE =
  'SupercalifragilisticexpialidociousUnbreakableContinuousStringForLayoutTestingWithNoSpacesHyphensOrDelimitersToEnsureTextWrapNeverBreaksTokensIncorrect' +
  ' Distinguished Systems Architecture & Scalable Cloud Research Group Lead At Cambridge Center XXXXXXXXXXXXXXXXXXXXXXXXXXX' +
  '123456789012345678901234567890';
const EXACT_100_CHAR_CITY = 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch-ExtraLongMetropolitanCityDistrictDivision';
const EXACT_70_CHAR_EMAIL = 'alexander.montgomery-chamberlain.distinguished.chair@research-inst.ac.';
const EXACT_25_CHAR_PHONE = '+1 (555) 019-283401928340';

// Fixture with exact extreme header fields
const extremeHeaderSections: any[] = [
  {
    id: 'sec-header',
    sectionType: 'header',
    title: 'Header & Contact Information',
    orderIndex: 0,
    isVisible: true,
    content: {
      schema_version: '1.0.0',
      fullName: EXACT_80_CHAR_NAME, // 80 chars
      headline: EXACT_300_CHAR_HEADLINE, // 300 chars with 150-char unbroken token
      email: EXACT_70_CHAR_EMAIL, // 70 chars
      phone: EXACT_25_CHAR_PHONE, // 25 chars
      city: EXACT_100_CHAR_CITY, // 100 chars
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

interface TextBoundingBox {
  str: string;
  x: number;
  y: number; // in PDF coordinate space (origin at bottom-left)
  width: number;
  height: number;
  top: number; // from top of page (841.89 - y)
  bottom: number;
  left: number;
  right: number;
  page: number;
}

async function renderAndExtractTextBoxes(templateId: TemplateId): Promise<{
  boxes: TextBoundingBox[];
  pageCount: number;
}> {
  const docElement = React.createElement(DocumentPdfRenderer, {
    meta: {
      id: `doc-${templateId}`,
      title: 'Extreme Header Resume',
      type: 'resume',
      templateId,
      accentColor: '#1A1A1A',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    sections: extremeHeaderSections,
  }) as any;

  const blob = await pdf(docElement).toBlob();
  const buffer = await blob.arrayBuffer();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;

  const boxes: TextBoundingBox[] = [];

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;

      // item.transform: [scaleX, skewY, skewX, scaleY, tx, ty]
      const tx = item.transform[4];
      const ty = item.transform[5];
      const width = item.width;
      const height = item.height || Math.abs(item.transform[3]) || 10;

      // In PDF coordinate space, ty is from bottom.
      // Top in standard down-coords is: viewport.height - ty
      const top = viewport.height - ty;
      const bottom = top + height;
      const left = tx;
      const right = tx + width;

      boxes.push({
        str: item.str,
        x: tx,
        y: ty,
        width,
        height,
        top,
        bottom,
        left,
        right,
        page: p,
      });
    }
  }

  return { boxes, pageCount: pdfDoc.numPages };
}

describe('Item 1: Header Overlap & Strict Bounding Box Collision Assertion', () => {
  const templates: TemplateId[] = ['ats_single_column', 'modern_professional', 'academic_cv'];

  for (const templateId of templates) {
    it(`[${templateId}] asserts no two text boxes from different lines overlap and all stay within page margins`, async () => {
      const { boxes } = await renderAndExtractTextBoxes(templateId);

      expect(boxes.length).toBeGreaterThan(5);

      // Check page margins: A4 is 595.28 x 841.89 pt.
      // ats_single_column & modern_professional: paddingHorizontal 40 -> margin 40pt (printable: 40..555.28)
      // academic_cv: paddingHorizontal 44 -> margin 44pt (printable: 44..551.28)
      const leftMarginLimit = templateId === 'academic_cv' ? 44 - 0.5 : 40 - 0.5;
      const rightMarginLimit = templateId === 'academic_cv' ? 551.28 + 0.5 : 555.28 + 0.5;

      for (const box of boxes) {
        expect(
          box.left,
          `Text "${box.str}" overflowed left margin at ${box.left.toFixed(2)}pt (limit: ${leftMarginLimit}pt)`
        ).toBeGreaterThanOrEqual(leftMarginLimit);
        expect(
          box.right,
          `Text "${box.str}" overflowed right margin at ${box.right.toFixed(2)}pt (limit: ${rightMarginLimit}pt)`
        ).toBeLessThanOrEqual(rightMarginLimit);
      }

      // Assert unbroken 150-char token is extracted completely without character loss
      const target150CharToken =
        'SupercalifragilisticexpialidociousUnbreakableContinuousStringForLayoutTestingWithNoSpacesHyphensOrDelimitersToEnsureTextWrapNeverBreaksTokensIncorrect';
      const concatenatedExtracted = boxes.map((b) => b.str).join('');
      expect(
        concatenatedExtracted.includes(target150CharToken),
        `Extracted PDF text must contain full 150-char token without character loss`
      ).toBe(true);

      // Group boxes by lines or check collision between boxes with different Y baseline
      // Two distinct text lines A and B have a vertical collision if:
      // A and B overlap horizontally (A.left < B.right - 1 && A.right > B.left + 1)
      // AND their vertical spans intersect by more than 0.5pt tolerance:
      // (A.top < B.bottom - 0.5 && A.bottom > B.top + 0.5)
      // and their baselines ty differ by more than 2pt (meaning they are not segments of the same line).
      const collisions: string[] = [];

      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];

          if (a.page !== b.page) continue;

          // Check if they are on different vertical lines (baseline difference > 2pt)
          const baselineDiff = Math.abs(a.y - b.y);
          if (baselineDiff <= 2.0) {
            // Same line segment (e.g. bullet and text) -> horizontal overlap check only
            continue;
          }

          // Distinct vertical lines: check vertical intersection
          // In top-down coords:
          const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);

          // If they intersect horizontally AND vertically by more than 0.5pt:
          if (horizontalOverlap > 0.5 && verticalOverlap > 0.5) {
            collisions.push(
              `Collision between "${a.str}" (top:${a.top.toFixed(1)}, bottom:${a.bottom.toFixed(1)}, left:${a.left.toFixed(1)}) and "${b.str}" (top:${b.top.toFixed(1)}, bottom:${b.bottom.toFixed(1)}, left:${b.left.toFixed(1)}) -> overlap: ${verticalOverlap.toFixed(2)}pt`
            );
          }
        }
      }

      console.log(`[${templateId}] Total text items: ${boxes.length}, collisions: ${collisions.length}`);
      if (collisions.length > 0) {
        console.error(`Collisions found in ${templateId}:\n`, collisions.join('\n'));
      }
      expect(collisions).toEqual([]);
    });
  }

  it('proves test validity: FAILS when run against deliberately overlapping text boxes', () => {
    // Deliberately broken boxes that overlap vertically and horizontally
    const brokenBoxes: TextBoundingBox[] = [
      {
        str: 'Header Line 1',
        x: 36,
        y: 800,
        width: 200,
        height: 14,
        top: 41.89,
        bottom: 55.89,
        left: 36,
        right: 236,
        page: 1,
      },
      {
        str: 'Overlapping Subline',
        x: 36,
        y: 795, // only 5pt lower than 14pt height box -> 9pt overlap!
        width: 180,
        height: 12,
        top: 46.89,
        bottom: 58.89,
        left: 36,
        right: 216,
        page: 1,
      },
    ];

    const collisions: string[] = [];
    const a = brokenBoxes[0];
    const b = brokenBoxes[1];
    const baselineDiff = Math.abs(a.y - b.y);
    const verticalOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);

    if (baselineDiff > 2.0 && horizontalOverlap > 0.5 && verticalOverlap > 0.5) {
      collisions.push(
        `Collision between "${a.str}" and "${b.str}" -> overlap: ${verticalOverlap.toFixed(2)}pt`
      );
    }

    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toContain('Collision between "Header Line 1" and "Overlapping Subline" -> overlap: 9.00pt');
  });
});
