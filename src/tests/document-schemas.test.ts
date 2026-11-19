import { describe, it, expect } from 'vitest';
import {
  documentMetaSchema,
  documentSectionSchema,
  fullDocumentSchema,
  validateDocumentSize,
} from '@/lib/documents/schemas';
import { ONE_PAGE_RESUME_FIXTURE } from '@/lib/fixtures/document-fixtures';

describe('Document Schemas and Limits', () => {
  it('validates a complete document fixture against fullDocumentSchema', () => {
    const parseResult = fullDocumentSchema.safeParse(ONE_PAGE_RESUME_FIXTURE);
    expect(parseResult.success).toBe(true);
  });

  it('validates document meta fields and enforces constraints', () => {
    const validMeta = {
      id: 'doc-123',
      user_id: 'user-456',
      type: 'resume' as const,
      title: 'Targeted Google SDE Resume',
      template_id: 'ats_single_column' as const,
      accent_color: '#800021',
      font_size: 'regular' as const,
      margin_size: 'regular' as const,
      version: 1,
      page_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(documentMetaSchema.safeParse(validMeta).success).toBe(true);

    // Invalid templateId
    expect(
      documentMetaSchema.safeParse({ ...validMeta, template_id: 'unsupported_tmpl' }).success
    ).toBe(false);

    // Empty title
    expect(documentMetaSchema.safeParse({ ...validMeta, title: '' }).success).toBe(false);
  });

  it('validates all section types correctly', () => {
    const headerSection = {
      id: 'sec-1',
      document_id: 'doc-1',
      section_type: 'header' as const,
      title: 'Header',
      custom_title: null,
      section_order: 0,
      is_visible: true,
      content: {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 234 567 8900',
        location: 'New York, NY',
        links: [{ label: 'GitHub', url: 'https://github.com/janedoe' }],
      },
    };
    expect(documentSectionSchema.safeParse(headerSection).success).toBe(true);

    const experienceSection = {
      id: 'sec-2',
      document_id: 'doc-1',
      section_type: 'experience' as const,
      title: 'Experience',
      custom_title: null,
      section_order: 1,
      is_visible: true,
      content: {
        entries: [
          {
            id: 'exp-1',
            title: 'Lead Architect',
            subtitle: 'Tech Global',
            location: 'San Francisco, CA',
            startDate: '2020-01',
            endDate: 'Present',
            isCurrent: true,
            bullets: ['Spearheaded zero-downtime migration.', 'Scaled system to 10M DAU.'],
          },
        ],
      },
    };
    expect(documentSectionSchema.safeParse(experienceSection).success).toBe(true);
  });

  it('enforces 64KB document section size limit', () => {
    const normalSection = ONE_PAGE_RESUME_FIXTURE.sections[0];
    expect(validateDocumentSize(normalSection)).toBe(true);

    // Create an oversized section > 64KB
    const giantText = 'a'.repeat(70000);
    const oversizedSection = {
      ...normalSection,
      content: {
        ...normalSection.content,
        giantField: giantText,
      },
    };
    expect(validateDocumentSize(oversizedSection)).toBe(false);
  });
});
