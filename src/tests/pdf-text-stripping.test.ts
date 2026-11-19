import { describe, it, expect } from 'vitest';
import { stripNonLatinScript, scanDocumentForNonLatin } from '@/lib/validation/pdf-text';
import { FullDocument } from '@/lib/documents/types';

describe('PDF Text Stripping and Non-Latin Detection', () => {
  it('preserves ASCII and accented Latin characters faithfully', () => {
    const text = 'François Mitterrand, Björn Zoëga, Sören Kierkegaard, Stanisław Lem, České Budějovice, Tromsø, São Paulo.';
    const stripped = stripNonLatinScript(text);
    expect(stripped).toBe(text);
  });

  it('strips non-Latin scripts (Devanagari, Cyrillic, Chinese, Arabic)', () => {
    const mixed = 'Senior Engineer (वरिष्ठ अभियंता) - Инженер - 工程师 - مهندس';
    const stripped = stripNonLatinScript(mixed);
    // Non-Latin characters removed, spaces normalized
    expect(stripped).toBe('Senior Engineer ( ) - - -');
  });

  it('scans full document and identifies non-Latin snippets for the editor warning banner', () => {
    const docWithNonLatin: FullDocument = {
      meta: {
        id: 'doc-scan',
        user_id: 'user-1',
        type: 'resume',
        title: 'Non-Latin Test',
        template_id: 'ats_single_column',
        accent_color: '#0B0B0B',
        font_size: 'regular',
        margin_size: 'regular',
        page_count: 1,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      sections: [
        {
          id: 'sec-1',
          document_id: 'doc-scan',
          section_type: 'header',
          title: 'Header',
          custom_title: null,
          section_order: 0,
          is_visible: true,
          content: {
            full_name: 'Amit Patel (अमित पटेल)',
            email: 'amit@example.com',
            phone: '1234567890',
            location: 'Mumbai, India',
            links: [],
          },
        },
        {
          id: 'sec-2',
          document_id: 'doc-scan',
          section_type: 'summary',
          title: 'Summary',
          custom_title: null,
          section_order: 1,
          is_visible: true,
          content: {
            text: 'Specialist in multilingual natural language processing (языковая обработка).',
          },
        },
      ],
    };

    const report = scanDocumentForNonLatin(docWithNonLatin.sections);
    expect(report.hasNonLatin).toBe(true);
    expect(report.affectedFields.length).toBe(2);
    expect(report.affectedFields[0]).toContain('Header: Full Name');
    expect(report.affectedFields[1]).toContain('Summary');
  });

  it('returns empty warnings for purely Latin documents', () => {
    const latinDoc: FullDocument = {
      meta: {
        id: 'doc-clean',
        user_id: 'user-1',
        type: 'resume',
        title: 'Clean Doc',
        template_id: 'ats_single_column',
        accent_color: '#0B0B0B',
        font_size: 'regular',
        margin_size: 'regular',
        page_count: 1,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      sections: [
        {
          id: 'sec-1',
          document_id: 'doc-clean',
          section_type: 'header',
          title: 'Header',
          custom_title: null,
          section_order: 0,
          is_visible: true,
          content: {
            full_name: 'Diyan Shah',
            email: 'diyan@example.com',
            phone: '1234567890',
            location: 'Mumbai',
            links: [],
          },
        },
      ],
    };

    const report = scanDocumentForNonLatin(latinDoc.sections);
    expect(report.hasNonLatin).toBe(false);
    expect(report.affectedFields.length).toBe(0);
  });
});
