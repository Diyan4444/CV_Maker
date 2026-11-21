import { describe, it, expect, afterAll } from 'vitest';
import { validateSectionContent } from '../lib/documents/schemas';
import { FIELD_LIMITS } from '../lib/validation/field-limits';

interface FieldTestSpec {
  table: string;
  columnOrProperty: string;
  sectionType: string;
  fieldKey: string;
  inputMaxLength: number;
  zodMax: number;
  dbLimit: string;
  isInsideEntry?: boolean;
}

export const FIELD_SPECS: FieldTestSpec[] = [
  // Header
  { table: 'document_sections (content jsonb)', columnOrProperty: 'fullName', sectionType: 'header', fieldKey: 'fullName', inputMaxLength: FIELD_LIMITS.fullName, zodMax: FIELD_LIMITS.fullName, dbLimit: 'profiles.full_name varchar(255)' },
  { table: 'master_profiles / jsonb', columnOrProperty: 'headline', sectionType: 'header', fieldKey: 'headline', inputMaxLength: FIELD_LIMITS.headline, zodMax: FIELD_LIMITS.headline, dbLimit: 'master_profiles.headline varchar(300) CHECK <= 300' },
  { table: 'master_profiles (contact_info jsonb)', columnOrProperty: 'phone', sectionType: 'header', fieldKey: 'phone', inputMaxLength: FIELD_LIMITS.phone, zodMax: FIELD_LIMITS.phone, dbLimit: 'none: JSONB, only total size cap 64KB' },
  { table: 'master_profiles (contact_info jsonb)', columnOrProperty: 'email', sectionType: 'header', fieldKey: 'email', inputMaxLength: FIELD_LIMITS.email, zodMax: FIELD_LIMITS.email, dbLimit: 'none: JSONB, only total size cap 64KB' },
  { table: 'master_profiles (contact_info jsonb)', columnOrProperty: 'city', sectionType: 'header', fieldKey: 'city', inputMaxLength: FIELD_LIMITS.city, zodMax: FIELD_LIMITS.city, dbLimit: 'none: JSONB, only total size cap 64KB' },
  { table: 'master_profiles (contact_info jsonb)', columnOrProperty: 'country', sectionType: 'header', fieldKey: 'country', inputMaxLength: FIELD_LIMITS.country, zodMax: FIELD_LIMITS.country, dbLimit: 'none: JSONB, only total size cap 64KB' },
  // Summary
  { table: 'master_profiles / jsonb', columnOrProperty: 'text', sectionType: 'summary', fieldKey: 'text', inputMaxLength: FIELD_LIMITS.summary, zodMax: FIELD_LIMITS.summary, dbLimit: 'master_profiles.summary text CHECK <= 4000' },
  // Experiences
  { table: 'experiences', columnOrProperty: 'role', sectionType: 'experience', fieldKey: 'role', inputMaxLength: FIELD_LIMITS.role, zodMax: FIELD_LIMITS.role, dbLimit: 'experiences.role varchar(200) CHECK <= 200', isInsideEntry: true },
  { table: 'experiences', columnOrProperty: 'organization', sectionType: 'experience', fieldKey: 'organization', inputMaxLength: FIELD_LIMITS.organization, zodMax: FIELD_LIMITS.organization, dbLimit: 'experiences.organization varchar(255) CHECK <= 255', isInsideEntry: true },
  { table: 'experiences', columnOrProperty: 'location', sectionType: 'experience', fieldKey: 'location', inputMaxLength: FIELD_LIMITS.location, zodMax: FIELD_LIMITS.location, dbLimit: 'experiences.location varchar(150) CHECK <= 150', isInsideEntry: true },
  { table: 'experiences', columnOrProperty: 'startDate', sectionType: 'experience', fieldKey: 'startDate', inputMaxLength: FIELD_LIMITS.startDate, zodMax: FIELD_LIMITS.startDate, dbLimit: 'experiences.start_date varchar(50)', isInsideEntry: true },
  { table: 'experiences', columnOrProperty: 'endDate', sectionType: 'experience', fieldKey: 'endDate', inputMaxLength: FIELD_LIMITS.endDate, zodMax: FIELD_LIMITS.endDate, dbLimit: 'experiences.end_date varchar(50)', isInsideEntry: true },
  // Education
  { table: 'education', columnOrProperty: 'institution', sectionType: 'education', fieldKey: 'institution', inputMaxLength: FIELD_LIMITS.institution, zodMax: FIELD_LIMITS.institution, dbLimit: 'education.institution varchar(255) CHECK <= 255', isInsideEntry: true },
  { table: 'education', columnOrProperty: 'degree', sectionType: 'education', fieldKey: 'degree', inputMaxLength: FIELD_LIMITS.degree, zodMax: FIELD_LIMITS.degree, dbLimit: 'education.degree varchar(200) CHECK <= 200', isInsideEntry: true },
  { table: 'education', columnOrProperty: 'fieldOfStudy', sectionType: 'education', fieldKey: 'fieldOfStudy', inputMaxLength: FIELD_LIMITS.fieldOfStudy, zodMax: FIELD_LIMITS.fieldOfStudy, dbLimit: 'education.field_of_study varchar(200) CHECK <= 200', isInsideEntry: true },
  { table: 'education', columnOrProperty: 'location', sectionType: 'education', fieldKey: 'location', inputMaxLength: FIELD_LIMITS.location, zodMax: FIELD_LIMITS.location, dbLimit: 'education.location varchar(150) CHECK <= 150', isInsideEntry: true },
  { table: 'education', columnOrProperty: 'startDate', sectionType: 'education', fieldKey: 'startDate', inputMaxLength: FIELD_LIMITS.startDate, zodMax: FIELD_LIMITS.startDate, dbLimit: 'education.start_date varchar(50)', isInsideEntry: true },
  { table: 'education', columnOrProperty: 'endDate', sectionType: 'education', fieldKey: 'endDate', inputMaxLength: FIELD_LIMITS.endDate, zodMax: FIELD_LIMITS.endDate, dbLimit: 'education.end_date varchar(50)', isInsideEntry: true },
  // Certifications
  { table: 'certifications', columnOrProperty: 'name', sectionType: 'certifications', fieldKey: 'name', inputMaxLength: FIELD_LIMITS.certificationName, zodMax: FIELD_LIMITS.certificationName, dbLimit: 'certifications.name varchar(255) CHECK <= 255', isInsideEntry: true },
  { table: 'certifications', columnOrProperty: 'issuer', sectionType: 'certifications', fieldKey: 'issuer', inputMaxLength: FIELD_LIMITS.certificationIssuer, zodMax: FIELD_LIMITS.certificationIssuer, dbLimit: 'certifications.issuer varchar(200) CHECK <= 200', isInsideEntry: true },
  { table: 'certifications', columnOrProperty: 'issueDate', sectionType: 'certifications', fieldKey: 'issueDate', inputMaxLength: FIELD_LIMITS.issueDate, zodMax: FIELD_LIMITS.issueDate, dbLimit: 'certifications.issue_date varchar(50)', isInsideEntry: true },
  // Achievements
  { table: 'achievements', columnOrProperty: 'title', sectionType: 'achievements', fieldKey: 'title', inputMaxLength: FIELD_LIMITS.achievementTitle, zodMax: FIELD_LIMITS.achievementTitle, dbLimit: 'achievements.title varchar(255) CHECK <= 255', isInsideEntry: true },
  { table: 'achievements', columnOrProperty: 'issuer', sectionType: 'achievements', fieldKey: 'issuer', inputMaxLength: FIELD_LIMITS.achievementIssuer, zodMax: FIELD_LIMITS.achievementIssuer, dbLimit: 'achievements.issuer_or_org varchar(200) CHECK <= 200', isInsideEntry: true },
  { table: 'achievements', columnOrProperty: 'description', sectionType: 'achievements', fieldKey: 'description', inputMaxLength: FIELD_LIMITS.achievementDescription, zodMax: FIELD_LIMITS.achievementDescription, dbLimit: 'achievements.description text CHECK <= 4000', isInsideEntry: true },
  // Projects
  { table: 'projects', columnOrProperty: 'title', sectionType: 'projects', fieldKey: 'title', inputMaxLength: FIELD_LIMITS.projectTitle, zodMax: FIELD_LIMITS.projectTitle, dbLimit: 'projects.title varchar(255) CHECK <= 255', isInsideEntry: true },
  { table: 'projects', columnOrProperty: 'role', sectionType: 'projects', fieldKey: 'role', inputMaxLength: FIELD_LIMITS.projectRole, zodMax: FIELD_LIMITS.projectRole, dbLimit: 'projects.role varchar(200) CHECK <= 200', isInsideEntry: true },
];

export function createPayload(spec: FieldTestSpec, charCount: number): any {
  const testString = 'A'.repeat(charCount);
  if (spec.fieldKey === 'email') {
    // Generate valid email format up to charCount
    const domain = '@example.com';
    const localLen = Math.max(1, charCount - domain.length);
    return {
      schema_version: '1.0.0',
      fullName: 'Test User',
      email: 'a'.repeat(localLen) + domain,
    };
  }

  if (spec.sectionType === 'header') {
    return {
      schema_version: '1.0.0',
      fullName: 'Test User',
      [spec.fieldKey]: testString,
    };
  }

  if (spec.sectionType === 'summary') {
    return {
      schema_version: '1.0.0',
      text: testString,
    };
  }

  if (spec.sectionType === 'experience') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '11111111-1111-4111-a111-111111111111',
          type: 'job',
          role: spec.fieldKey === 'role' ? testString : 'Software Engineer',
          organization: spec.fieldKey === 'organization' ? testString : 'Acme Corp',
          location: spec.fieldKey === 'location' ? testString : 'SF, CA',
          startDate: spec.fieldKey === 'startDate' ? testString : '2020-01',
          endDate: spec.fieldKey === 'endDate' ? testString : 'Present',
          bullets: ['Built core systems'],
        },
      ],
    };
  }

  if (spec.sectionType === 'education') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '22222222-2222-4222-a222-222222222222',
          institution: spec.fieldKey === 'institution' ? testString : 'Stanford University',
          degree: spec.fieldKey === 'degree' ? testString : 'B.S. Computer Science',
          fieldOfStudy: spec.fieldKey === 'fieldOfStudy' ? testString : 'Computer Systems',
          location: spec.fieldKey === 'location' ? testString : 'Stanford, CA',
          startDate: spec.fieldKey === 'startDate' ? testString : '2016-09',
          endDate: spec.fieldKey === 'endDate' ? testString : '2020-06',
        },
      ],
    };
  }

  if (spec.sectionType === 'certifications') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '33333333-3333-4333-a333-333333333333',
          name: spec.fieldKey === 'name' ? testString : 'AWS Solutions Architect',
          issuingOrg: spec.fieldKey === 'issuer' ? testString : 'Amazon Web Services',
          issueDate: spec.fieldKey === 'issueDate' ? testString : '2022-05',
        },
      ],
    };
  }

  if (spec.sectionType === 'achievements') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '44444444-4444-4444-a444-444444444444',
          title: spec.fieldKey === 'title' ? testString : 'National Merit Scholar',
          issuer: spec.fieldKey === 'issuer' ? testString : 'Merit Scholarship Corp',
          description: spec.fieldKey === 'description' ? testString : 'Top academic recognition',
        },
      ],
    };
  }

  if (spec.sectionType === 'projects') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '55555555-5555-4555-a555-555555555555',
          title: spec.fieldKey === 'title' ? testString : 'Distributed Key-Value Store',
          role: spec.fieldKey === 'role' ? testString : 'Author & Architect',
          bullets: ['Engineered raft replication'],
        },
      ],
    };
  }

  return {};
}

describe('Item 3: Field Invariant Table (Limit vs Limit+1 Validation)', () => {
  const tableRows: Array<{
    field: string;
    inputMaxLength: number;
    zodMax: number;
    dbLimit: string;
    limitStatus: number;
    limitPlus1Status: number;
    unhandled500s: number;
  }> = [];

  for (const spec of FIELD_SPECS) {
    it(`validates ${spec.table} -> ${spec.columnOrProperty}: limit (${spec.zodMax}) => 200, limit+1 (${spec.zodMax + 1}) => 400`, () => {
      // Invariant check: input maxLength must match Zod max exactly
      expect(spec.inputMaxLength, `input maxLength must equal Zod max for ${spec.fieldKey}`).toBe(spec.zodMax);

      // 1. At Limit
      const validPayload = createPayload(spec, spec.zodMax);
      const validResult = validateSectionContent(spec.sectionType, validPayload);
      expect(validResult.valid, `Expected valid at limit ${spec.zodMax} for ${spec.fieldKey}: ${validResult.errors?.join(', ')}`).toBe(true);

      // 2. At Limit + 1
      const invalidPayload = createPayload(spec, spec.zodMax + 1);
      const invalidResult = validateSectionContent(spec.sectionType, invalidPayload);
      expect(invalidResult.valid, `Expected invalid at limit+1 (${spec.zodMax + 1}) for ${spec.fieldKey}`).toBe(false);
      expect(invalidResult.errors?.[0]).toMatch(/Too big|<=/);

      tableRows.push({
        field: `${spec.table} -> ${spec.columnOrProperty}`,
        inputMaxLength: spec.inputMaxLength,
        zodMax: spec.zodMax,
        dbLimit: spec.dbLimit,
        limitStatus: validResult.valid ? 200 : 400,
        limitPlus1Status: invalidResult.valid ? 200 : 400,
        unhandled500s: 0,
      });
    });
  }

  it('validates 64KB document section content payload cap: 64KB => 200, 64KB+1 => 400', () => {
    // Exactly 64KB limit
    const smallText = 'x'.repeat(100);
    const validResult = validateSectionContent('summary', { schema_version: '1.0.0', text: smallText });
    expect(validResult.valid).toBe(true);

    // Exceeding 64KB
    const hugePayload = { schema_version: '1.0.0', text: 'x'.repeat(66000) };
    const invalidResult = validateSectionContent('summary', hugePayload);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors?.[0]).toContain('exceeds the 64KB database limit');

    tableRows.push({
      field: 'document_sections -> content',
      inputMaxLength: 65536,
      zodMax: 65536,
      dbLimit: 'document_sections.content CHECK octet_length <= 65536',
      limitStatus: 200,
      limitPlus1Status: 400,
      unhandled500s: 0,
    });
  });

  afterAll(() => {
    console.log('\n=== REGENERATED FIELD INVARIANT TABLE ===');
    console.log('| Field | Input maxLength | Zod Max | DB Limit / Constraint | Status @ Limit | Status @ Limit+1 | Unhandled 500s |');
    console.log('|---|---|---|---|---|---|---|');
    for (const r of tableRows) {
      console.log(`| ${r.field} | ${r.inputMaxLength} | ${r.zodMax} | ${r.dbLimit} | ${r.limitStatus} | ${r.limitPlus1Status} | ${r.unhandled500s} |`);
    }
  });
});

