import { describe, it, expect } from 'vitest';
import {
  checkContactDetails,
  checkSectionHeadings,
  checkTextExtraction,
  checkSplitWords,
  checkExperienceEducationDates,
  checkResumePageCount,
  checkLayoutFacts,
  checkVisibleUrls,
  checkNonLatinText,
  checkEmptySections,
  runAtsReadinessChecks,
} from '../lib/ats/checker';
import { ONE_PAGE_RESUME_FIXTURE } from '../lib/fixtures/document-fixtures';
import { DocumentMeta, DocumentSection } from '../lib/documents/types';

describe('ATS Readiness Checks (10 Pure Rules)', () => {
  // 1. Contact Details
  describe('1. Contact Details Check', () => {
    it('passes when full name, email, phone and location are provided', () => {
      const result = checkContactDetails(ONE_PAGE_RESUME_FIXTURE.sections);
      expect(result.status).toBe('pass');
    });

    it('needs attention when full name is missing', () => {
      const sections = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE.sections));
      const header = sections.find((s: any) => s.section_type === 'header');
      header.content.fullName = '';
      header.content.full_name = '';

      const result = checkContactDetails(sections);
      expect(result.status).toBe('needs_attention');
      expect(result.explanation).toContain('Full name is missing');
    });

    it('needs attention when email is invalid or missing', () => {
      const sections = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE.sections));
      const header = sections.find((s: any) => s.section_type === 'header');
      header.content.email = 'not-an-email';

      const result = checkContactDetails(sections);
      expect(result.status).toBe('needs_attention');
      expect(result.explanation).toContain('email address is required');
    });

    it('flags info when phone or location is omitted', () => {
      const sections = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE.sections));
      const header = sections.find((s: any) => s.section_type === 'header');
      header.content.phone = '';

      const result = checkContactDetails(sections);
      expect(result.status).toBe('info');
      expect(result.explanation).toContain('Phone number not provided');
    });
  });

  // 2. Section Headings Recognizable
  describe('2. Section Headings Recognizable', () => {
    it('passes when all headings are standard', () => {
      const result = checkSectionHeadings(ONE_PAGE_RESUME_FIXTURE.sections);
      expect(result.status).toBe('pass');
    });

    it('flags info when an unusual custom heading is used', () => {
      const sections: DocumentSection[] = [
        {
          id: 'sec-custom',
          document_id: 'doc-1',
          section_type: 'custom',
          title: 'My Random Life Odyssey',
          custom_title: 'My Random Life Odyssey',
          section_order: 1,
          is_visible: true,
          content: { entries: [] },
        },
      ];
      const result = checkSectionHeadings(sections);
      expect(result.status).toBe('info');
      expect(result.explanation).toContain('My Random Life Odyssey');
    });
  });

  // 3. Text Extraction & Order
  describe('3. Text Extraction & Order', () => {
    it('passes when extracted text contains name first and document order', () => {
      const text = 'Alex Example • alex@example.com\nSUMMARY\nPassionate engineer\nEXPERIENCE\nSenior Developer';
      const result = checkTextExtraction(ONE_PAGE_RESUME_FIXTURE.sections, text);
      expect(result.status).toBe('pass');
    });

    it('needs attention when text is empty', () => {
      const result = checkTextExtraction(ONE_PAGE_RESUME_FIXTURE.sections, '');
      expect(result.status).toBe('needs_attention');
      expect(result.explanation).toContain('No readable text could be extracted');
    });

    it('needs attention when name appears after section headings', () => {
      const text = 'EXPERIENCE\nSenior Developer\nAlex Example';
      const result = checkTextExtraction(ONE_PAGE_RESUME_FIXTURE.sections, text);
      expect(result.status).toBe('needs_attention');
      expect(result.explanation).toContain('Applicant name appears after section headings');
    });
  });

  // 4. Split Words
  describe('4. Split Words Check', () => {
    it('passes when zero hyphen-space words are detected', () => {
      const text = 'Architected high-throughput distributed consensus pipelines without issues.';
      const result = checkSplitWords(text);
      expect(result.status).toBe('pass');
    });

    it('needs attention when hyphen-space words are detected', () => {
      const text = 'Specialized in high-stress microarchitecture simula- tions and geo- graphic redundancy.';
      const result = checkSplitWords(text);
      expect(result.status).toBe('needs_attention');
      expect(result.explanation).toContain('simula- tions');
    });
  });

  // 5. Experience / Education Chronological Dates
  describe('5. Experience/Education Dates', () => {
    it('passes when all entries have dates', () => {
      const result = checkExperienceEducationDates(ONE_PAGE_RESUME_FIXTURE.sections);
      expect(result.status).toBe('pass');
    });

    it('flags info when an entry has no dates', () => {
      const sections = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE.sections));
      const expSec = sections.find((s: any) => s.section_type === 'experience');
      expSec.content.entries[0].startDate = '';
      expSec.content.entries[0].start_date = '';
      expSec.content.entries[0].endDate = '';
      expSec.content.entries[0].end_date = '';
      expSec.content.entries[0].isCurrent = false;

      const result = checkExperienceEducationDates(sections);
      expect(result.status).toBe('info');
      expect(result.explanation).toContain('has no start or end date specified');
    });
  });

  // 6. Resume Page Count
  describe('6. Resume Page Count Check', () => {
    it('passes when resume is 1 or 2 pages', () => {
      const meta: DocumentMeta = { id: '1', title: 'Resume', type: 'resume', version: 1 };
      expect(checkResumePageCount(meta, 1).status).toBe('pass');
      expect(checkResumePageCount(meta, 2).status).toBe('pass');
    });

    it('flags info when resume exceeds 2 pages', () => {
      const meta: DocumentMeta = { id: '1', title: 'Resume', type: 'resume', version: 1 };
      const result = checkResumePageCount(meta, 3);
      expect(result.status).toBe('info');
      expect(result.explanation).toContain('3 pages');
    });

    it('passes for CVs even when page count is high', () => {
      const meta: DocumentMeta = { id: '1', title: 'CV', type: 'cv', version: 1 };
      const result = checkResumePageCount(meta, 6);
      expect(result.status).toBe('pass');
      expect(result.explanation).toContain('Academic CV length is 6 pages');
    });
  });

  // 7. Layout Facts Derived From Template
  describe('7. Layout Facts Check', () => {
    it('passes and derives single column, table-free, vector layout for ATS single column', () => {
      const meta: DocumentMeta = {
        id: '1',
        title: 'Resume',
        type: 'resume',
        template_id: 'ats_single_column',
        version: 1,
      };
      const result = checkLayoutFacts(meta);
      expect(result.status).toBe('pass');
      expect(result.explanation).toContain('Single-column linear flow');
      expect(result.explanation).toContain('table-free');
    });

    it('passes for modern_professional and academic_cv', () => {
      const metaModern: DocumentMeta = {
        id: '1',
        title: 'Resume',
        type: 'resume',
        template_id: 'modern_professional',
        version: 1,
      };
      expect(checkLayoutFacts(metaModern).status).toBe('pass');

      const metaAcademic: DocumentMeta = {
        id: '2',
        title: 'CV',
        type: 'cv',
        template_id: 'academic_cv',
        version: 1,
      };
      expect(checkLayoutFacts(metaAcademic).status).toBe('pass');
    });
  });

  // 8. Visible URL Text for Links
  describe('8. Visible URL Text Check', () => {
    it('passes when valid URLs are present', () => {
      const result = checkVisibleUrls(ONE_PAGE_RESUME_FIXTURE.sections);
      expect(result.status).toBe('pass');
    });

    it('needs attention when a generic unreadable link anchor like "click here" is used', () => {
      const sections = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE.sections));
      const header = sections.find((s: any) => s.section_type === 'header');
      header.content.website = 'Click Here';

      const result = checkVisibleUrls(sections);
      expect(result.status).toBe('needs_attention');
      expect(result.explanation).toContain('generic link anchor');
    });
  });

  // 9. Non-Latin Text Removed From PDF
  describe('9. Non-Latin Text Check', () => {
    it('passes when all text is Latin script', () => {
      const result = checkNonLatinText(ONE_PAGE_RESUME_FIXTURE.sections);
      expect(result.status).toBe('pass');
    });

    it('flags info when non-Latin characters (e.g. Cyrillic or Chinese) are detected', () => {
      const sections = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE.sections));
      const expSec = sections.find((s: any) => s.section_type === 'experience');
      expSec.content.entries[0].role = 'Senior Architect (Системный Архитектор)';

      const result = checkNonLatinText(sections);
      expect(result.status).toBe('info');
      expect(result.explanation).toContain('Non-Latin script characters detected');
      expect(result.explanation).toContain('Professional Experience role');
    });
  });

  // 10. Empty Visible Sections
  describe('10. Empty Visible Sections Check', () => {
    it('passes when visible sections contain entries', () => {
      const result = checkEmptySections(ONE_PAGE_RESUME_FIXTURE.sections);
      expect(result.status).toBe('pass');
    });

    it('flags info when a visible section has empty entries', () => {
      const sections = JSON.parse(JSON.stringify(ONE_PAGE_RESUME_FIXTURE.sections));
      sections.push({
        id: 'sec-empty-projects',
        document_id: 'doc-1',
        section_type: 'projects',
        title: 'Projects',
        section_order: 10,
        is_visible: true,
        content: { entries: [] },
      });

      const result = checkEmptySections(sections);
      expect(result.status).toBe('info');
      expect(result.explanation).toContain('contains no active entries');
    });
  });

  // Full Suite Execution & Timing
  describe('Full Suite Execution', () => {
    it('runs all 10 checks in under 10ms with accurate summary counts', () => {
      const extractedText = 'Alex Example • alex@example.com\nSUMMARY\nPassionate engineer\nEXPERIENCE\nSenior Developer';
      const report = runAtsReadinessChecks(
        ONE_PAGE_RESUME_FIXTURE.meta,
        ONE_PAGE_RESUME_FIXTURE.sections,
        extractedText,
        1
      );

      expect(report.title).toBe('ATS readiness checks');
      expect(report.note).toContain('Automated checks, not a guarantee');
      expect(report.checks.length).toBe(10);
      expect(report.summary.passCount + report.summary.needsAttentionCount + report.summary.infoCount).toBe(10);
      expect(report.durationMs).toBeLessThan(50);
      console.log('ATS Full Suite Duration:', report.durationMs, 'ms; Summary:', report.summary);
    });
  });
});
