import { describe, it, expect } from 'vitest';
import { AccountExportDataSchema, EXCLUDED_COLUMNS } from '../lib/account/export-schema';

describe('Export Schema & Excluded Columns', () => {
  it('defines explicit excluded columns map for all 14 core tables', () => {
    const requiredTables = [
      'profiles',
      'master_profiles',
      'education',
      'experiences',
      'projects',
      'skills',
      'publications',
      'achievements',
      'certifications',
      'custom_sections',
      'documents',
      'document_sections',
      'websites',
      'ai_usage_logs',
    ];

    for (const table of requiredTables) {
      expect(EXCLUDED_COLUMNS).toHaveProperty(table);
      expect(Array.isArray(EXCLUDED_COLUMNS[table])).toBe(true);
    }
  });

  it('validates a complete, valid export payload', () => {
    const validPayload = {
      exportVersion: '1.0.0',
      exportedAt: '2026-11-24T00:00:00.000Z',
      account: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
      profile: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'user@example.com',
        full_name: 'Test User',
      },
      masterProfile: {
        id: '00000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000001',
      },
      education: [],
      experiences: [],
      projects: [],
      skills: [],
      publications: [],
      achievements: [],
      certifications: [],
      customSections: [],
      documents: [
        {
          id: '00000000-0000-0000-0000-000000000003',
          user_id: '00000000-0000-0000-0000-000000000001',
          title: 'My Resume',
          type: 'resume',
          template_id: 'modern',
          is_archived: false,
          created_at: '2026-11-22T00:00:00.000Z',
          updated_at: '2026-11-22T00:00:00.000Z',
          sections: [
            {
              id: '00000000-0000-0000-0000-000000000004',
              document_id: '00000000-0000-0000-0000-000000000003',
              section_type: 'experience',
              title: 'Experience',
              order_index: 0,
              is_visible: true,
              content: {},
              created_at: '2026-11-22T00:00:00.000Z',
              updated_at: '2026-11-22T00:00:00.000Z',
            },
          ],
        },
      ],
      website: null,
      aiUsageLogs: [],
    };

    const parsed = AccountExportDataSchema.parse(validPayload);
    expect(parsed.exportVersion).toBe('1.0.0');
    expect(parsed.account.email).toBe('user@example.com');
    expect(parsed.documents).toHaveLength(1);
    expect(parsed.documents[0].sections).toHaveLength(1);
  });

  it('fails validation on invalid account email or missing required fields', () => {
    const invalidPayload = {
      exportVersion: '1.0.0',
      exportedAt: '2026-11-24T00:00:00.000Z',
      account: {
        id: 'not-a-uuid',
        email: 'invalid-email',
        createdAt: '2026-11-20T00:00:00.000Z',
      },
      profile: null,
      masterProfile: null,
      education: [],
      experiences: [],
      projects: [],
      skills: [],
      publications: [],
      achievements: [],
      certifications: [],
      customSections: [],
      documents: [],
      website: null,
      aiUsageLogs: [],
    };

    expect(() => AccountExportDataSchema.parse(invalidPayload)).toThrow();
  });
});
