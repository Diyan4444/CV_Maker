import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { STANDARD_FONT_DATA_URL } from './test-utils/pdfjs-node-setup';
import { AtsSingleColumnTemplate } from '../components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '../components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '../components/pdf/templates/AcademicCv';
import { checkTextExtraction, checkSplitWords, runAtsReadinessChecks } from '../lib/ats/checker';
import { DocumentSection, TemplateId } from '../lib/documents/types';
import { breakUrl, breakEmail, wrapLongTokens } from '../lib/pdf/wrap-long-tokens';

// Exactly 60 characters
export const EXACT_60_CHAR_URL = 'https://example.com/portfolio/showcase/projects/profile/view';

// Exactly 45 characters
export const EXACT_45_CHAR_EMAIL = 'alexander.example.developer@engineering.co.uk';

// Exactly 120 characters, hyphen-free, with natural '/' break opportunities
export const EXACT_120_CHAR_URL =
  'https://example.com/department/computational/biophysics/spectrometry/molecular/genomics/neuroscience/quantum/algorithm/v';

// Exactly 90 characters
export const EXACT_90_CHAR_EMAIL =
  'alexander.montgomery.chamberlain.systems.fellow@subdomain.institute.advanced.studies.ac.uk';

// Exactly 70 characters
export const EXACT_70_CHAR_EMAIL =
  'alexander.montgomery.chamberlain@cambridge.theoretical.physics.dept.ac';

export const longTokenMeta = {
  id: 'doc-long-tokens',
  title: 'Long Tokens Test Document',
  slug: 'long-tokens-test-document',
  target_role: 'Distinguished Systems Architect',
  type: 'resume',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const longTokenSections: DocumentSection[] = [
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

const templates: Array<{ id: TemplateId; Component: React.ComponentType<any>; margin: number }> = [
  { id: 'ats_single_column', Component: AtsSingleColumnTemplate, margin: 36 },
  { id: 'modern_professional', Component: ModernProfessionalTemplate, margin: 36 },
  { id: 'academic_cv', Component: AcademicCvTemplate, margin: 40 },
];

describe('Item 3: Long URLs and Emails Wrapping & Margin Safety', () => {
  it('verifies exact input token lengths and constraints', () => {
    expect(EXACT_120_CHAR_URL.length).toBe(120);
    expect(EXACT_120_CHAR_URL.includes('-')).toBe(false);
    expect(EXACT_90_CHAR_EMAIL.length).toBe(90);
    expect(EXACT_70_CHAR_EMAIL.length).toBe(70);
  });

  for (const { id, Component, margin } of templates) {
    it(`[${id}] wraps 120-char URL, 90-char email, and 70-char email within margins, preserves order, and avoids collisions`, async () => {
      const element = React.createElement(Component, {
        meta: longTokenMeta,
        sections: longTokenSections,
      });

      const blob = await pdf(element as any).toBlob();
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // 1. pdfjs geometric text position check
      const loadingTask = pdfjs.getDocument({
        data: uint8,
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
      });
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      const PAGE_WIDTH = viewport.width; // 595.28
      const leftMarginMin = margin - 0.5;
      const rightMarginMax = PAGE_WIDTH - margin + 0.5;

      const itemsWithBoxes: Array<{ str: string; x: number; y: number; w: number; h: number; right: number }> = [];
      let fullExtractedText = '';

      for (const item of textContent.items as any[]) {
        if (!item.str || item.str.trim() === '') continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const w = item.width;
        const h = item.height || 9;
        const right = x + w;

        // Verify inside margins
        expect(x).toBeGreaterThanOrEqual(leftMarginMin);
        expect(right).toBeLessThanOrEqual(rightMarginMax);

        itemsWithBoxes.push({ str: item.str, x, y, w, h, right });
        fullExtractedText += item.str + ' ';
      }

      // Check no two items on different lines collide vertically (overlap tolerance 0.5pt)
      for (let i = 0; i < itemsWithBoxes.length; i++) {
        for (let j = i + 1; j < itemsWithBoxes.length; j++) {
          const a = itemsWithBoxes[i];
          const b = itemsWithBoxes[j];

          const verticalOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          const horizontalOverlap = Math.min(a.right, b.right) - Math.max(a.x, b.x);

          if (verticalOverlap > 0.5 && horizontalOverlap > 0.5) {
            const isSameLineAdjacent = Math.abs(a.y - b.y) < 1.0;
            if (!isSameLineAdjacent) {
              throw new Error(`Text collision detected between "${a.str}" and "${b.str}"`);
            }
          }
        }
      }

      // 2. Extracted text verification: exact character-level audit
      // Verify zero hidden or non-printable Unicode characters across ALL extracted items
      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        for (let c = 0; c < item.str.length; c++) {
          const code = item.str.charCodeAt(c);
          if (
            code === 0x200B || // Zero-width space
            code === 0x00AD || // Soft hyphen
            code === 0xFEFF || // Zero-width no-break space / BOM
            code === 0x200C || // Zero-width non-joiner
            code === 0x200D    // Zero-width joiner
          ) {
            throw new Error(`Hidden character detected in extracted item: U+${code.toString(16).toUpperCase()}`);
          }
        }
      }

      // Reconstruct extracted text
      const rawExtractedNoSpaces = fullExtractedText.replace(/\s+/g, '');

      // Locate exact 120-char URL slice in extracted stream
      const urlStart = rawExtractedNoSpaces.indexOf(EXACT_120_CHAR_URL.slice(0, 20));
      expect(urlStart, 'URL start not found in extracted text').toBeGreaterThanOrEqual(0);
      const extractedUrlSegment = rawExtractedNoSpaces.slice(urlStart, urlStart + EXACT_120_CHAR_URL.length);

      // Locate exact 90-char email slice in extracted stream
      const emailStart = rawExtractedNoSpaces.indexOf(EXACT_90_CHAR_EMAIL.slice(0, 20));
      expect(emailStart, 'Email start not found in extracted text').toBeGreaterThanOrEqual(0);
      const extractedEmailSegment = rawExtractedNoSpaces.slice(emailStart, emailStart + EXACT_90_CHAR_EMAIL.length);

      console.log(`[${id}] Extracted URL Escaped:  `, JSON.stringify(extractedUrlSegment));
      console.log(`[${id}] Original URL Escaped:   `, JSON.stringify(EXACT_120_CHAR_URL));
      console.log(`[${id}] Extracted Email Escaped:`, JSON.stringify(extractedEmailSegment));
      console.log(`[${id}] Original Email Escaped: `, JSON.stringify(EXACT_90_CHAR_EMAIL));

      // Assert exact strict character equality with original
      expect(extractedUrlSegment).toBe(EXACT_120_CHAR_URL);
      expect(extractedEmailSegment).toBe(EXACT_90_CHAR_EMAIL);

      const cleanExtracted = fullExtractedText.replace(/\s+/g, '');
      const cleanUrl = EXACT_120_CHAR_URL.replace(/\s+/g, '');
      expect(cleanExtracted).toContain(cleanUrl);

      const cleanEmail90 = EXACT_90_CHAR_EMAIL.replace(/\s+/g, '');
      expect(cleanExtracted).toContain(cleanEmail90);

      const cleanEmail70 = EXACT_70_CHAR_EMAIL.replace(/\s+/g, '');
      expect(cleanExtracted).toContain(cleanEmail70);

      // 3. ATS readiness checks must NOT produce false failures
      const extractionCheck = checkTextExtraction(longTokenSections, fullExtractedText);
      expect(extractionCheck.status).toBe('pass');

      const splitWordsCheck = checkSplitWords(fullExtractedText);
      expect(splitWordsCheck.status).toBe('pass');

      const fullReport = runAtsReadinessChecks(longTokenMeta as any, longTokenSections, fullExtractedText, 1);
      expect(fullReport.summary.passCount).toBeGreaterThanOrEqual(9);
    });
  }

  it('verifies 60-character URL and 45-character email that fit on line are NOT broken', () => {
    expect(EXACT_60_CHAR_URL.length).toBe(60);
    expect(EXACT_45_CHAR_EMAIL.length).toBe(45);

    // Pure function checks: zero newlines inserted
    const unbrokenUrl = breakUrl(EXACT_60_CHAR_URL);
    expect(unbrokenUrl).toBe(EXACT_60_CHAR_URL);
    expect(unbrokenUrl.includes('\n')).toBe(false);

    const unbrokenEmail = breakEmail(EXACT_45_CHAR_EMAIL);
    expect(unbrokenEmail).toBe(EXACT_45_CHAR_EMAIL);
    expect(unbrokenEmail.includes('\n')).toBe(false);

    const wrappedUrl = wrapLongTokens(EXACT_60_CHAR_URL);
    expect(wrappedUrl).toBe(EXACT_60_CHAR_URL);
    expect(wrappedUrl.includes('\n')).toBe(false);

    const wrappedEmail = wrapLongTokens(EXACT_45_CHAR_EMAIL);
    expect(wrappedEmail).toBe(EXACT_45_CHAR_EMAIL);
    expect(wrappedEmail.includes('\n')).toBe(false);
  });

  it('verifies URLs break only after delimiters and never inside words like departments or directory', () => {
    const testUrl =
      'https://subdomain.university.edu/departments/computer-science/faculty/directory/alexander-montgomery-chamberlain';
    const broken = breakUrl(testUrl, 65);
    const lines = broken.split('\n');

    expect(lines.length).toBeGreaterThan(1);
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      // Every non-terminal line must end in a natural delimiter
      const lastChar = line[line.length - 1];
      expect(['/', '?', '&', '=', '.'], `Line "${line}" must end in natural delimiter`).toContain(lastChar);
    }

    // Assert words are intact and not split
    expect(broken).toContain('departments/');
    expect(broken).toContain('directory/');
    expect(broken).not.toContain('department\n');
    expect(broken).not.toContain('director\n');
  });

  it('verifies hyphenated names break only after hyphens and never split words like Smithington', () => {
    const longName =
      'Prof. Dr. Maximilian Alexander Montgomery-Chamberlain-Fitzgerald-Smithington III';
    const wrapped = wrapLongTokens(longName, 38, 35);
    const lines = wrapped.split('\n');

    expect(lines.length).toBeGreaterThan(1);
    // Smithington must remain completely intact
    expect(wrapped).toContain('Smithington');
    expect(wrapped).not.toContain('S\nmithington');
    expect(wrapped).not.toContain('Smith\nington');

    // Any break inside the hyphenated token must occur after a hyphen
    expect(wrapped).toContain('Montgomery-Chamberlain-Fitzgerald-\nSmithington');
  });

  for (const { id, Component } of templates) {
    it(`[${id}] renders 60-char URL and 45-char email intact without internal newline in PDF extracted text`, async () => {
      const normalSections: DocumentSection[] = [
        {
          id: 'sec-header',
          document_id: 'doc-normal-tokens',
          section_type: 'header',
          title: 'Header',
          custom_title: null,
          section_order: 0,
          is_visible: true,
          content: {
            fullName: 'Alex Example',
            headline: 'Systems Architect',
            email: EXACT_45_CHAR_EMAIL,
            phone: '+1 (555) 019-2834',
            location: 'Cambridge, MA',
            links: [{ label: EXACT_60_CHAR_URL, url: EXACT_60_CHAR_URL }],
          },
        },
      ];

      const normalMeta = {
        id: 'doc-normal-tokens',
        title: 'Normal Tokens Test',
        slug: 'normal-tokens-test',
        target_role: 'Systems Architect',
        type: 'resume',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const element = React.createElement(Component, {
        meta: normalMeta,
        sections: normalSections,
      });

      const asPdf = pdf(element as any);
      const blob = await asPdf.toBlob();
      const arrayBuffer = await blob.arrayBuffer();

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
        standardFontDataUrl: STANDARD_FONT_DATA_URL,
      });
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);
      const textContent = await page.getTextContent();
      const extractedStrings = (textContent.items as any[]).map((it) => it.str);
      const fullText = extractedStrings.join(' ');

      // Verify the 60-char URL appears unbroken in extracted text
      expect(fullText).toContain(EXACT_60_CHAR_URL);
      // Verify the 45-char email appears unbroken in extracted text
      expect(fullText).toContain(EXACT_45_CHAR_EMAIL);

      // Verify the 60-char URL appears unbroken with NO internal newline
      const urlItem = extractedStrings.find((s) => s.includes('portfolio/showcase'));
      expect(urlItem, 'URL text item should exist in extracted text').toBeDefined();
      expect(urlItem).toContain(EXACT_60_CHAR_URL);
      expect(urlItem!.includes('\n')).toBe(false);

      // Verify the 45-char email appears unbroken with NO internal newline
      const emailItem = extractedStrings.find((s) => s.includes('alexander.example.developer'));
      expect(emailItem, 'Email text item should exist in extracted text').toBeDefined();
      expect(emailItem).toContain(EXACT_45_CHAR_EMAIL);
      expect(emailItem!.includes('\n')).toBe(false);
    });
  }
});
