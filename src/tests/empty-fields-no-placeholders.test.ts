import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { AtsSingleColumnTemplate } from '@/components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '@/components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '@/components/pdf/templates/AcademicCv';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';

const FORBIDDEN_FALLBACKS = [
  'Certification Authority',
  'Certification Name',
  'Institution Name',
  'Company Name',
  'Degree / Program',
  'Role / Title',
  'Achievement Title',
  'Workshop / Training Program',
  'Professional Candidate',
];

describe('Item 1: Placeholder Text & Forbidden Fallback Elimination', () => {
  it('static source scan: asserts forbidden fallback literals do not exist in template, editor, or schema sources', () => {
    const filesToScan = [
      'src/components/pdf/templates/AtsSingleColumn.tsx',
      'src/components/pdf/templates/ModernProfessional.tsx',
      'src/components/pdf/templates/AcademicCv.tsx',
      'src/app/(dashboard)/editor/[documentId]/DocumentEditor.tsx',
      'src/lib/documents/schemas.ts',
      'src/lib/documents/profile-to-document.ts',
      'src/app/api/documents/create/route.ts',
      'src/app/api/documents/[documentId]/save/route.ts',
      'src/app/api/profile/onboarding/route.ts',
      'src/app/api/profile/save/route.ts',
    ];

    const violations: string[] = [];

    for (const relPath of filesToScan) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Skip comment lines or test documentation
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

        for (const forbidden of FORBIDDEN_FALLBACKS) {
          // Check for forbidden literal in code
          if (line.includes(`'${forbidden}'`) || line.includes(`"${forbidden}"`)) {
            violations.push(`${relPath}:${idx + 1} contains forbidden literal: "${forbidden}"`);
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  const emptyDocMeta: DocumentMeta = {
    id: 'doc-empty-test',
    user_id: 'user-empty',
    type: 'resume',
    title: 'Minimal Resume',
    target_role: '',
    target_company: '',
    template_id: 'ats_single_column',
    accent_color: '#0B0B0B',
    version: 1,
  };

  const emptySections: DocumentSection[] = [
    {
      id: 'sec-header',
      documentId: 'doc-empty-test',
      sectionType: 'header',
      title: 'Header & Contact Information',
      orderIndex: 0,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        fullName: 'Jane Doe',
        headline: '',
        email: 'jane@example.com',
        phone: '',
        city: '',
        country: '',
      },
    },
    {
      id: 'sec-edu',
      documentId: 'doc-empty-test',
      sectionType: 'education',
      title: 'Education',
      orderIndex: 1,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        entries: [
          {
            id: 'edu-1',
            institution: '',
            degree: '',
            fieldOfStudy: '',
            startDate: '',
            endDate: '',
            isCurrent: false,
            bullets: [],
          },
        ],
      },
    },
    {
      id: 'sec-exp',
      documentId: 'doc-empty-test',
      sectionType: 'experience',
      title: 'Experience',
      orderIndex: 2,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        entries: [
          {
            id: 'exp-1',
            role: '',
            organization: '',
            location: '',
            startDate: '',
            endDate: '',
            isCurrent: false,
            bullets: [],
          },
        ],
      },
    },
    {
      id: 'sec-certs',
      documentId: 'doc-empty-test',
      sectionType: 'certifications',
      title: 'Certifications & Licenses',
      orderIndex: 3,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        entries: [
          {
            id: 'cert-1',
            name: 'AWS Solutions Architect Associate',
            issuingOrg: '',
            issueDate: '',
          },
        ],
      },
    },
    {
      id: 'sec-achs',
      documentId: 'doc-empty-test',
      sectionType: 'achievements',
      title: 'Achievements & Honors',
      orderIndex: 4,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        entries: [
          {
            id: 'ach-1',
            title: 'Hackathon Finalist',
            issuer: '',
            date: '',
            description: '',
          },
        ],
      },
    },
  ];

  const templates = [
    { id: 'ats_single_column', Component: AtsSingleColumnTemplate },
    { id: 'modern_professional', Component: ModernProfessionalTemplate },
    { id: 'academic_cv', Component: AcademicCvTemplate },
  ] as const;

  for (const { id, Component } of templates) {
    it(`[${id}] renders document with empty fields without emitting any forbidden default or placeholder words`, async () => {
      const meta = { ...emptyDocMeta, template_id: id };
      const docElement = React.createElement(Component, { meta, sections: emptySections });
      const stream = await pdf(docElement as any).toBuffer();
      const chunks: Buffer[] = [];
      for await (const chunk of stream as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      const text = result.text || '';

      // Assert user-entered content is present
      expect(text).toContain('Jane Doe');
      expect(text).toContain('jane@example.com');
      expect(text).toContain('AWS Solutions Architect Associate');
      expect(text).toContain('Hackathon Finalist');

      // Assert NO forbidden words appear anywhere in the extracted text
      for (const forbidden of FORBIDDEN_FALLBACKS) {
        expect(text).not.toContain(forbidden);
      }

      // Assert that empty dates do NOT output 'Present' when isCurrent is false and dates are blank
      expect(text).not.toContain('Present');
      expect(text).not.toContain('–');
    });
  }
});
