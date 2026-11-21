import { FIELD_LIMITS } from './field-limits';

export interface FieldTestSpec {
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
          id: '11111111-1111-4111-a111-111111111111',
          institution: spec.fieldKey === 'institution' ? testString : 'MIT',
          degree: spec.fieldKey === 'degree' ? testString : 'B.S.',
          fieldOfStudy: spec.fieldKey === 'fieldOfStudy' ? testString : 'CS',
          location: spec.fieldKey === 'location' ? testString : 'Cambridge, MA',
          startDate: spec.fieldKey === 'startDate' ? testString : '2016',
          endDate: spec.fieldKey === 'endDate' ? testString : '2020',
        },
      ],
    };
  }

  if (spec.sectionType === 'certifications') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '11111111-1111-4111-a111-111111111111',
          name: spec.fieldKey === 'name' ? testString : 'AWS Certified Architect',
          issuer: spec.fieldKey === 'issuer' ? testString : 'Amazon Web Services',
          issueDate: spec.fieldKey === 'issueDate' ? testString : '2022',
        },
      ],
    };
  }

  if (spec.sectionType === 'achievements') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '11111111-1111-4111-a111-111111111111',
          title: spec.fieldKey === 'title' ? testString : 'First Place Hackathon',
          issuer: spec.fieldKey === 'issuer' ? testString : 'TechFest',
          description: spec.fieldKey === 'description' ? testString : 'Won grand prize',
        },
      ],
    };
  }

  if (spec.sectionType === 'projects') {
    return {
      schema_version: '1.0.0',
      entries: [
        {
          id: '11111111-1111-4111-a111-111111111111',
          title: spec.fieldKey === 'title' ? testString : 'Open Source Engine',
          role: spec.fieldKey === 'role' ? testString : 'Lead Maintainer',
        },
      ],
    };
  }

  return { schema_version: '1.0.0' };
}
