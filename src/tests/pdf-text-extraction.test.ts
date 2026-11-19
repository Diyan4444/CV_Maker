 
import { describe, it, expect } from 'vitest';
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { AtsSingleColumnTemplate } from '@/components/pdf/templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from '@/components/pdf/templates/ModernProfessional';
import { AcademicCvTemplate } from '@/components/pdf/templates/AcademicCv';
import {
  ONE_PAGE_RESUME_FIXTURE,
  TWO_PAGE_RESUME_FIXTURE,
  THREE_PAGE_ACADEMIC_CV_FIXTURE,
} from '@/lib/fixtures/document-fixtures';

async function extractPdfText(docComponent: any): Promise<string> {
  const stream = await pdf(docComponent).toBuffer();
  const chunks: Buffer[] = [];
  for await (const chunk of stream as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text || '';
}

describe('PDF Text Extraction & Template Rendering', () => {
  it('renders AtsSingleColumnTemplate and extracts text with name first and ordered sections', async () => {
    const element = React.createElement(AtsSingleColumnTemplate, {
      meta: ONE_PAGE_RESUME_FIXTURE.meta,
      sections: ONE_PAGE_RESUME_FIXTURE.sections,
    });
    const text = await extractPdfText(element);

    // 1. Candidate name is at the very beginning of the document
    expect(text.trim().startsWith('Diyan Shah')).toBe(true);

    // 2. Contact details present
    expect(text).toContain('diyan.shah@example.com');
    expect(text).toContain('+91 98765 43210');
    expect(text).toContain('Mumbai, Maharashtra, India');

    // 3. Section headings appear in linear ATS order
    const summaryIdx = text.indexOf('PROFESSIONAL SUMMARY');
    const eduIdx = text.indexOf('EDUCATION');
    const expIdx = text.indexOf('PROFESSIONAL EXPERIENCE');
    const projIdx = text.indexOf('TECHNICAL PROJECTS');
    const skillsIdx = text.indexOf('TECHNICAL SKILLS');

    expect(summaryIdx).toBeGreaterThan(0);
    expect(eduIdx).toBeGreaterThan(summaryIdx);
    expect(expIdx).toBeGreaterThan(eduIdx);
    expect(projIdx).toBeGreaterThan(expIdx);
    expect(skillsIdx).toBeGreaterThan(projIdx);

    // 4. Content entries & bullets verified
    expect(text).toContain('Nexus Distributed Technologies');
    expect(text).toContain('Software Development Engineer');
    expect(text).toContain('B.Tech in Computer Engineering');
    expect(text).toContain('Kestrel Key-Value Storage Engine');
  });

  it('renders ModernProfessionalTemplate with header typography and structured sections', async () => {
    const element = React.createElement(ModernProfessionalTemplate, {
      meta: TWO_PAGE_RESUME_FIXTURE.meta,
      sections: TWO_PAGE_RESUME_FIXTURE.sections,
    });
    const text = await extractPdfText(element);

    // Candidate name at top
    expect(text.trim().startsWith('Priya Sharma')).toBe(true);
    expect(text).toContain('priya.sharma@example.org');

    // Hierarchy & Sections
    expect(text).toContain('EXECUTIVE SUMMARY');
    expect(text).toContain('PROFESSIONAL EXPERIENCE');
    expect(text).toContain('Vanguard Global Cloud');
    expect(text).toContain('Staff Infrastructure Architect');
    expect(text).toContain('Stratos Distributed Networks');
    expect(text).toContain('Indian Institute of Technology, Madras');
    expect(text).toContain('Certified Kubernetes Administrator');
  });

  it('renders AcademicCvTemplate with numbered publications and scholarly layout', async () => {
    const element = React.createElement(AcademicCvTemplate, {
      meta: THREE_PAGE_ACADEMIC_CV_FIXTURE.meta,
      sections: THREE_PAGE_ACADEMIC_CV_FIXTURE.sections,
    });
    const text = await extractPdfText(element);

    // Candidate scholarly title at top
    expect(text.trim().startsWith('Dr. Siddharth Venkataraman, Ph.D.')).toBe(true);
    expect(text).toContain('Stanford, California, United States');

    // Academic sections
    expect(text).toContain('RESEARCH SPECIALIZATION & AGENDA');
    expect(text).toContain('ACADEMIC DEGREES');
    expect(text).toContain('University of California, Berkeley');
    expect(text).toContain('PEER-REVIEWED CONFERENCE & JOURNAL PUBLICATIONS');

    // Publications extracted with numbered brackets [1], [2] and DOIs
    expect(text).toContain('[1] "Formally Verified Non-Volatile Multi-Paxos with Bounded Log Replay"');
    expect(text).toContain('DOI: 10.1145/3600006.3613145');
    expect(text).toContain('[2] "Zero-Copy Shared Memory Interconnects for Disaggregated Microservices"');
    expect(text).toContain('NSF Postdoctoral Research Fellowship');
  });
});
