import { z } from 'zod';

export interface ExcludedColumn {
  table: string;
  column: string;
  reason: string;
}

/**
 * Explicit list of columns excluded from the data export, along with justifications.
 * In Quillfolio, all application tables in public schema contain strictly user-owned
 * profile content, documents, settings, and telemetry. Authentication tokens, passwords,
 * and service secrets are never stored in these tables. Therefore, 100% of user columns
 * are included, and zero columns are excluded.
 */
export const EXCLUDED_COLUMNS: Record<string, ExcludedColumn[]> = {
  profiles: [],
  master_profiles: [],
  education: [],
  experiences: [],
  projects: [],
  skills: [],
  publications: [],
  achievements: [],
  certifications: [],
  custom_sections: [],
  documents: [],
  document_sections: [],
  websites: [],
  ai_usage_logs: [],
};

export const AccountExportAccountSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

export const DocumentSectionExportSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  section_type: z.string(),
  title: z.string(),
  order_index: z.number(),
  is_visible: z.boolean(),
  content: z.unknown(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export const DocumentExportSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    title: z.string(),
    type: z.string(),
    template_id: z.string(),
    sections: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

export const AccountExportDataSchema = z.object({
  exportVersion: z.string(),
  exportedAt: z.string(),
  account: AccountExportAccountSchema,
  profile: z.record(z.string(), z.unknown()).nullable(),
  masterProfile: z.record(z.string(), z.unknown()).nullable(),
  education: z.array(z.record(z.string(), z.unknown())),
  experiences: z.array(z.record(z.string(), z.unknown())),
  projects: z.array(z.record(z.string(), z.unknown())),
  skills: z.array(z.record(z.string(), z.unknown())),
  publications: z.array(z.record(z.string(), z.unknown())),
  achievements: z.array(z.record(z.string(), z.unknown())),
  certifications: z.array(z.record(z.string(), z.unknown())),
  customSections: z.array(z.record(z.string(), z.unknown())),
  documents: z.array(DocumentExportSchema),
  website: z.record(z.string(), z.unknown()).nullable(),
  aiUsageLogs: z.array(z.record(z.string(), z.unknown())),
});

export type AccountExportData = z.infer<typeof AccountExportDataSchema>;
