import { z } from 'zod';
import { FIELD_LIMITS } from '@/lib/validation/field-limits';

export const MAX_SECTION_PAYLOAD_BYTES = FIELD_LIMITS.sectionContentBytes; // 64KB DB limit

export const DocumentStatusSchema = z.enum(['draft', 'ready']);

export const BaseEntrySchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid().nullable().optional(),
  isVisible: z.boolean().optional(),
});

export const EducationEntrySchema = BaseEntrySchema.extend({
  institution: z.string().min(1, 'Institution is required').max(FIELD_LIMITS.institution),
  degree: z.string().min(1, 'Degree is required').max(FIELD_LIMITS.degree),
  fieldOfStudy: z.string().max(FIELD_LIMITS.fieldOfStudy).optional(),
  location: z.string().max(FIELD_LIMITS.location).optional(),
  startDate: z.string().max(FIELD_LIMITS.startDate).optional(),
  endDate: z.string().max(FIELD_LIMITS.endDate).optional(),
  isCurrent: z.boolean().optional(),
  grade: z.string().max(50).optional(),
  bullets: z.array(z.string().max(1000)).optional(),
});

export const ExperienceEntrySchema = BaseEntrySchema.extend({
  type: z.string().max(50),
  organization: z.string().min(1, 'Organization is required').max(FIELD_LIMITS.organization),
  role: z.string().min(1, 'Role is required').max(FIELD_LIMITS.role),
  location: z.string().max(FIELD_LIMITS.location).optional(),
  startDate: z.string().max(FIELD_LIMITS.startDate).optional(),
  endDate: z.string().max(FIELD_LIMITS.endDate).optional(),
  isCurrent: z.boolean().optional(),
  bullets: z.array(z.string().max(1000)).optional(),
  technologies: z.array(z.string().max(100)).optional(),
});

export const ProjectEntrySchema = BaseEntrySchema.extend({
  title: z.string().min(1, 'Title is required').max(FIELD_LIMITS.projectTitle),
  role: z.string().max(FIELD_LIMITS.projectRole).optional(),
  startDate: z.string().max(FIELD_LIMITS.startDate).optional(),
  endDate: z.string().max(FIELD_LIMITS.endDate).optional(),
  url: z.string().max(FIELD_LIMITS.url).optional(),
  repoUrl: z.string().max(FIELD_LIMITS.url).optional(),
  bullets: z.array(z.string().max(1000)).optional(),
  toolsUsed: z.array(z.string().max(100)).optional(),
});

export const SkillEntrySchema = BaseEntrySchema.extend({
  category: z.string().min(1, 'Category is required').max(100),
  items: z.array(
    z.object({
      name: z.string().min(1).max(100),
      proficiency: z.string().max(50).optional(),
    })
  ),
});

export const PublicationEntrySchema = BaseEntrySchema.extend({
  title: z.string().min(1, 'Title is required').max(300),
  authors: z.array(z.string().max(100)),
  venue: z.string().max(255).optional(),
  publicationDate: z.string().max(50).optional(),
  doiOrUrl: z.string().max(500).optional(),
  summary: z.string().max(FIELD_LIMITS.summary).optional(),
});

export const AchievementEntrySchema = BaseEntrySchema.extend({
  title: z.string().min(1, 'Title is required').max(FIELD_LIMITS.achievementTitle),
  issuer: z.string().max(FIELD_LIMITS.achievementIssuer).optional().or(z.literal('')).default(''),
  date: z.string().max(50).optional().or(z.literal('')),
  description: z.string().max(FIELD_LIMITS.achievementDescription).optional().or(z.literal('')),
  url: z.string().max(FIELD_LIMITS.url).optional().or(z.literal('')),
});

export const CertificationEntrySchema = BaseEntrySchema.extend({
  name: z.string().min(1, 'Name is required').max(FIELD_LIMITS.certificationName),
  issuingOrg: z.string().max(FIELD_LIMITS.certificationIssuer).optional().or(z.literal('')).default(''),
  issuer: z.string().max(FIELD_LIMITS.certificationIssuer).optional().or(z.literal('')).default(''),
  issueDate: z.string().max(FIELD_LIMITS.issueDate).optional().or(z.literal('')),
  expiryDate: z.string().max(50).optional().or(z.literal('')),
  credentialId: z.string().max(FIELD_LIMITS.credentialId).optional().or(z.literal('')),
  credentialUrl: z.string().max(FIELD_LIMITS.url).optional().or(z.literal('')),
});

export const CustomEntrySchema = BaseEntrySchema.extend({
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(200).optional().or(z.literal('')).default(''),
  date: z.string().max(50).optional().or(z.literal('')),
  description: z.string().max(FIELD_LIMITS.summary).optional().or(z.literal('')),
  bullets: z.array(z.string().max(1000)).optional(),
});

export const HeaderContentSchema = z.object({
  schema_version: z.literal('1.0.0').optional().default('1.0.0'),
  fullName: z.string().min(1).max(FIELD_LIMITS.fullName).optional(),
  full_name: z.string().max(FIELD_LIMITS.fullName).optional(),
  preferredName: z.string().max(150).optional().or(z.literal('')),
  preferred_name: z.string().max(150).optional().or(z.literal('')),
  email: z.string().email().max(FIELD_LIMITS.email).optional().or(z.literal('')),
  phone: z.string().max(FIELD_LIMITS.phone).optional().or(z.literal('')),
  city: z.string().max(FIELD_LIMITS.city).optional().or(z.literal('')),
  country: z.string().max(FIELD_LIMITS.country).optional().or(z.literal('')),
  location: z.string().max(FIELD_LIMITS.location).optional().or(z.literal('')),
  linkedinUrl: z.string().max(500).optional().or(z.literal('')),
  githubUrl: z.string().max(500).optional().or(z.literal('')),
  websiteUrl: z.string().max(500).optional().or(z.literal('')),
  otherLinks: z.array(z.string().max(500)).optional(),
  links: z.array(z.object({ label: z.string().max(100), url: z.string().max(500) })).optional(),
  headline: z.string().max(FIELD_LIMITS.headline).optional().or(z.literal('')),
});

export const SummaryContentSchema = z.object({
  schema_version: z.literal('1.0.0'),
  text: z.string().max(FIELD_LIMITS.summary),
});

export const SectionContentSchemaMap = {
  header: HeaderContentSchema,
  summary: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    text: z.string().max(FIELD_LIMITS.summary),
  }),
  education: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(EducationEntrySchema),
  }),
  experience: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(ExperienceEntrySchema),
  }),
  projects: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(ProjectEntrySchema),
  }),
  skills: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(SkillEntrySchema),
  }),
  publications: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(PublicationEntrySchema),
  }),
  achievements: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(AchievementEntrySchema),
  }),
  certifications: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(CertificationEntrySchema),
  }),
  custom: z.object({
    schema_version: z.literal('1.0.0').optional().default('1.0.0'),
    entries: z.array(CustomEntrySchema),
  }),
};

/**
 * Validates a section content payload by type and size
 */
export function validateSectionContent(sectionType: string, content: unknown): {
  valid: boolean;
  errors?: string[];
  byteSize: number;
} {
  const jsonStr = JSON.stringify(content);
  const byteSize = new TextEncoder().encode(jsonStr).length;

  if (byteSize > MAX_SECTION_PAYLOAD_BYTES) {
    return {
      valid: false,
      errors: [
        `Section size (${(byteSize / 1024).toFixed(1)}KB) exceeds the 64KB database limit. Please shorten descriptions or entries.`,
      ],
      byteSize,
    };
  }

  const schema = SectionContentSchemaMap[sectionType as keyof typeof SectionContentSchemaMap];
  if (!schema) {
    return {
      valid: false,
      errors: [`Unknown section type: ${sectionType}`],
      byteSize,
    };
  }

  const parsed = schema.safeParse(content);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      byteSize,
    };
  }

  return { valid: true, byteSize };
}

export const documentMetaSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: z.enum(['resume', 'cv']),
  title: z.string().min(1).max(200),
  target_role: z.string().max(200).nullable().optional(),
  target_company: z.string().max(200).nullable().optional(),
  template_id: z.enum(['ats_single_column', 'modern_professional', 'academic_cv']),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  font_size: z.enum(['compact', 'regular', 'spacious']).optional(),
  margin_size: z.enum(['compact', 'regular', 'spacious']).optional(),
  page_count: z.number().int().min(1).max(10).optional(),
  version: z.number().int().min(1),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const documentSectionSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  section_type: z.string(),
  title: z.string(),
  custom_title: z.string().nullable().optional(),
  section_order: z.number().int(),
  is_visible: z.boolean(),
  content: z.record(z.string(), z.any()),
});

export const fullDocumentSchema = z.object({
  meta: documentMetaSchema,
  sections: z.array(documentSectionSchema),
});

export function validateDocumentSize(section: { content: unknown }): boolean {
  const jsonStr = JSON.stringify(section.content);
  return new TextEncoder().encode(jsonStr).length <= MAX_SECTION_PAYLOAD_BYTES;
}

