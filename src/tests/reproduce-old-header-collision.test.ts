import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { STANDARD_FONT_DATA_URL } from './test-utils/pdfjs-node-setup';
import { AtsSingleColumnTemplate } from '../components/pdf/templates/AtsSingleColumn';
import { DocumentSection, DocumentMeta } from '../lib/documents/types';

const EXACT_80_CHAR_NAME = 'Prof. Dr. Maximilian Alexander Montgomery-Chamberlain-Fitzgerald-Smithington III';
const EXACT_300_CHAR_HEADLINE =
  'SupercalifragilisticexpialidociousUnbreakableContinuousStringForLayoutTestingWithNoSpacesHyphensOrDelimitersToEnsureTextWrapNeverBreaksTokensIncorrect' +
  ' Distinguished Systems Architecture & Scalable Cloud Research Group Lead At Cambridge Center XXXXXXXXXXXXXXXXXXXXXXXXXXX' +
  '123456789012345678901234567890';
const EXACT_100_CHAR_CITY = 'Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch-ExtraLongMetropolitanCityDistrictDivision';
const EXACT_70_CHAR_EMAIL = 'alexander.montgomery-chamberlain.distinguished.chair@research-inst.ac.';
const EXACT_25_CHAR_PHONE = '+1 (555) 019-283401928340';

const extremeDoc: { meta: DocumentMeta; sections: DocumentSection[] } = {
  meta: {
    id: 'test-extreme',
    userId: 'u1',
    title: 'Extreme Layout Test',
    type: 'resume',
    templateId: 'ats_single_column',
    accentColor: '#0B0B0B',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  sections: [
    {
      id: 'sec-header',
      documentId: 'test-extreme',
      sectionType: 'header',
      title: 'Header',
      orderIndex: 0,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        fullName: EXACT_80_CHAR_NAME,
        headline: EXACT_300_CHAR_HEADLINE,
        email: EXACT_70_CHAR_EMAIL,
        phone: EXACT_25_CHAR_PHONE,
        location: EXACT_100_CHAR_CITY,
      },
    },
  ],
};

// Initial commit 7c50059 layout:
// 1. contactRow had flexDirection: 'row', flexWrap: 'wrap', gap: 4
// 2. name had marginBottom: 2
// 3. headline had marginBottom: 4
function Original7c50059HeaderDocument() {
  const styles = StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 40,
      fontSize: 9.5,
      fontFamily: 'Helvetica',
      color: '#0B0B0B',
      lineHeight: 1.35,
    },
    headerContainer: {
      marginBottom: 14,
      textAlign: 'center',
    },
    name: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 2,
      color: '#0B0B0B',
    },
    headline: {
      fontSize: 10,
      color: '#333333',
      marginBottom: 4,
    },
    contactRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      fontSize: 8.5,
      color: '#333333',
      flexWrap: 'wrap',
      gap: 4,
    },
  });

  const h = extremeDoc.sections[0].content as any;
  const contactParts = [h.email, h.phone, h.location];

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.headerContainer },
        React.createElement(Text, { style: styles.name }, h.fullName),
        React.createElement(Text, { style: styles.headline }, h.headline),
        React.createElement(
          View,
          { style: styles.contactRow },
          contactParts.map((part, idx) =>
            React.createElement(
              Text,
              { key: idx },
              `${part} ${idx < contactParts.length - 1 ? '•' : ''}`
            )
          )
        )
      )
    )
  );
}

async function analyzeLayout(docComponent: any) {
  const blob = await pdf(docComponent).toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(1);
  const textContent = await page.getTextContent();

  const boxes: Array<{ text: string; x: number; y: number; w: number; h: number }> = [];

  for (const item of textContent.items) {
    if ('str' in item && item.str.trim().length > 0) {
      const x = item.transform[4];
      const y = item.transform[5];
      const w = item.width;
      const h = item.height || item.transform[0];
      boxes.push({ text: item.str, x, y, w, h });
    }
  }

  const collisions: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const b1 = boxes[i];
      const b2 = boxes[j];

      if (Math.abs(b1.y - b2.y) < 1.0) continue;

      const top1 = b1.y + b1.h;
      const bottom1 = b1.y;
      const top2 = b2.y + b2.h;
      const bottom2 = b2.y;

      const verticalOverlap = Math.min(top1, top2) - Math.max(bottom1, bottom2);
      const horizontalOverlap = Math.min(b1.x + b1.w, b2.x + b2.w) - Math.max(b1.x, b2.x);

      if (verticalOverlap > 0.5 && horizontalOverlap > 0.5) {
        collisions.push(
          `Box "${b1.text}" [y=${bottom1.toFixed(2)}..${top1.toFixed(2)}] collides with Box "${b2.text}" [y=${bottom2.toFixed(2)}..${top2.toFixed(2)}] (vOverlap=${verticalOverlap.toFixed(2)}pt, hOverlap=${horizontalOverlap.toFixed(2)}pt)`
        );
      }
    }
  }

  return { boxes, collisions };
}

describe('Header Overlap Root Cause Demonstration', () => {
  it('analyzes collision in Original 7c50059 Layout vs Current Fixed Layout', async () => {
    const originalResult = await analyzeLayout(React.createElement(Original7c50059HeaderDocument));
    console.log(`\n--- ORIGINAL 7c50059 LAYOUT ---`);
    console.log(`Text items count: ${originalResult.boxes.length}`);
    console.log(`Collisions detected: ${originalResult.collisions.length}`);
    originalResult.collisions.forEach((c) => console.log('  COLLISION:', c));

    const fixedResult = await analyzeLayout(
      React.createElement(AtsSingleColumnTemplate, {
        meta: extremeDoc.meta,
        sections: extremeDoc.sections,
      })
    );
    console.log(`\n--- CURRENT FIXED LAYOUT ---`);
    console.log(`Text items count: ${fixedResult.boxes.length}`);
    console.log(`Collisions detected: ${fixedResult.collisions.length}`);

    console.log('\n--- TEXT ITEMS BREAKDOWN IN PDF.JS ---');
    fixedResult.boxes.forEach((b, idx) => {
      console.log(`  Item #${idx + 1}: "${b.text}" [x=${b.x.toFixed(2)}, y=${b.y.toFixed(2)}, w=${b.w.toFixed(2)}, h=${b.h.toFixed(2)}]`);
    });

    expect(fixedResult.collisions.length).toBe(0);
  });
});
