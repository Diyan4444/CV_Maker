/**
 * Single Source of Truth for all field length limits across CV Maker.
 * 
 * Invariants:
 * 1. UI Input maxLength == FIELD_LIMITS[field]
 * 2. Zod schema max(FIELD_LIMITS[field])
 * 3. DB Limit == FIELD_LIMITS[field] (for relational columns and DB CHECK constraints)
 *    For JSONB-stored fields, DB protection is the JSONB byte-size cap (64KB on sections, 8KB on contact_info).
 */

export const FIELD_LIMITS = {
  // Profiles & Header
  fullName: 255,          // profiles.full_name varchar(255)
  headline: 300,          // master_profiles.headline varchar(300) + CHECK <= 300
  phone: 100,             // JSONB contact_info / section content (app code + 8KB/64KB JSONB cap)
  email: 150,             // JSONB contact_info (app code + profiles.email varchar(255))
  city: 150,              // JSONB contact_info (app code + 8KB/64KB JSONB cap)
  country: 150,           // JSONB contact_info (app code + 8KB/64KB JSONB cap)
  location: 150,          // experiences.location varchar(150), education.location varchar(150)
  
  // Summary
  summary: 4000,          // master_profiles.summary CHECK <= 4000

  // Experience
  role: 200,              // experiences.role varchar(200) + CHECK <= 200
  organization: 255,      // experiences.organization varchar(255) + CHECK <= 255
  startDate: 50,          // experiences.start_date varchar(50)
  endDate: 50,            // experiences.end_date varchar(50)

  // Education
  institution: 255,       // education.institution varchar(255) + CHECK <= 255
  degree: 200,            // education.degree varchar(200) + CHECK <= 200
  fieldOfStudy: 200,      // education.field_of_study varchar(200) + CHECK <= 200

  // Certifications
  certificationName: 255, // certifications.name varchar(255) + CHECK <= 255
  certificationIssuer: 200, // certifications.issuer varchar(200) + CHECK <= 200
  issueDate: 50,          // certifications.issue_date varchar(50)
  credentialId: 150,      // certifications JSONB / credential ID
  url: 500,               // certifications.url varchar(500) + CHECK <= 500

  // Achievements
  achievementTitle: 255,  // achievements.title varchar(255) + CHECK <= 255
  achievementIssuer: 200, // achievements.issuer_or_org varchar(200) + CHECK <= 200
  achievementDescription: 4000, // achievements.description CHECK <= 4000

  // Projects
  projectTitle: 255,      // projects.title varchar(255) + CHECK <= 255
  projectRole: 200,       // projects.role varchar(200) + CHECK <= 200
  projectDescription: 4000, // projects description in JSONB / bullets

  // Document metadata & section caps
  documentTitle: 200,     // documents.title varchar(200) + CHECK <= 200
  targetRole: 200,        // documents.target_role varchar(200) + CHECK <= 200
  sectionTitle: 150,      // document_sections.title varchar(150) + CHECK <= 150
  sectionContentBytes: 65536, // document_sections.content CHECK octet_length <= 65536 (64KB)
} as const;

export type FieldLimitKey = keyof typeof FIELD_LIMITS;
