/**
 * Document Data Types & Section Definitions
 * Strictly aligned with docs/PRODUCT_VISION.md Sections 4A, 4B, 6, 7, 9 & 11
 */

export type DocumentType = 'resume' | 'cv';
export type DocumentStatus = 'draft' | 'ready';
export type TemplateId = 'ats_single_column' | 'modern_professional' | 'academic_cv';

export interface DocumentMeta {
  id: string;
  userId?: string;
  user_id?: string;
  title: string;
  type: DocumentType;
  status?: DocumentStatus;
  templateId?: TemplateId;
  template_id?: TemplateId;
  accentColor?: string;
  accent_color?: string;
  targetRole?: string | null;
  target_role?: string | null;
  targetCompany?: string | null;
  target_company?: string | null;
  version: number;
  schemaVersion?: string;
  fontSize?: string;
  font_size?: string;
  marginSize?: string;
  margin_size?: string;
  pageCount?: number | null;
  page_count?: number | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export type SectionType =
  | 'header'
  | 'summary'
  | 'education'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'publications'
  | 'achievements'
  | 'certifications'
  | 'custom';

export interface BaseEntry {
  id: string;
  sourceId?: string | null;
  isVisible?: boolean;
  [key: string]: unknown;
}

export interface EducationEntry extends BaseEntry {
  institution?: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  grade?: string;
  bullets?: string[];
}

export interface ExperienceEntry extends BaseEntry {
  type?: string;
  organization?: string;
  role?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  bullets?: string[];
  technologies?: string[];
}

export interface ProjectEntry extends BaseEntry {
  title?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  repoUrl?: string;
  bullets?: string[];
  toolsUsed?: string[];
}

export interface SkillEntry extends BaseEntry {
  category?: string;
  items?: Array<{ name: string; proficiency?: string }>;
}

export interface PublicationEntry extends BaseEntry {
  title?: string;
  authors?: string[];
  venue?: string;
  publicationDate?: string;
  doiOrUrl?: string;
  summary?: string;
}

export interface AchievementEntry extends BaseEntry {
  title?: string;
  issuer?: string;
  date?: string;
  description?: string;
  url?: string;
}

export interface CertificationEntry extends BaseEntry {
  name?: string;
  issuingOrg?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface CustomEntry extends BaseEntry {
  title?: string;
  subtitle?: string;
  location?: string;
  date?: string;
  description?: string;
  bullets?: string[];
}

export interface HeaderContent {
  schema_version?: '1.0.0';
  fullName?: string;
  full_name?: string;
  preferredName?: string;
  preferred_name?: string;
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  otherLinks?: string[];
  links?: Array<{ label: string; url: string }>;
  headline?: string;
  [key: string]: unknown;
}

export interface SummaryContent {
  schema_version?: '1.0.0';
  text: string;
  [key: string]: unknown;
}

export interface EntriesContent<T extends BaseEntry = BaseEntry> {
  schema_version?: '1.0.0';
  entries: T[];
  [key: string]: unknown;
}

export type SectionContent =
  | HeaderContent
  | SummaryContent
  | EntriesContent<EducationEntry>
  | EntriesContent<ExperienceEntry>
  | EntriesContent<ProjectEntry>
  | EntriesContent<SkillEntry>
  | EntriesContent<PublicationEntry>
  | EntriesContent<AchievementEntry>
  | EntriesContent<CertificationEntry>
  | EntriesContent<CustomEntry>
  | EntriesContent<BaseEntry>;

export interface DocumentSection {
  id: string;
  documentId?: string;
  document_id?: string;
  sectionType?: SectionType;
  section_type?: SectionType;
  title: string;
  customTitle?: string | null;
  custom_title?: string | null;
  orderIndex?: number;
  section_order?: number;
  isVisible?: boolean;
  is_visible?: boolean;
  content: SectionContent;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface FullDocument {
  meta: DocumentMeta;
  sections: DocumentSection[];
  copiedFromProfileAt?: string;
}
