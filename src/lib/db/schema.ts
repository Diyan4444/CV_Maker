import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * 1. PROFILES (Keyed directly to Supabase auth.users.id)
 * No duplicate custom users table.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  email: varchar('email', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).default(''),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 2. MASTER PROFILES (Normalized, single source of truth per user)
 */
export const masterProfiles = pgTable('master_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' })
    .unique(),
  backgroundGroup: varchar('background_group', { length: 100 }), // engineering_technology, commerce_management, etc.
  specialization: varchar('specialization', { length: 150 }),
  stage: varchar('stage', { length: 100 }), // 1st_year, final_year, graduate, professional...
  purposes: jsonb('purposes').$type<string[]>().default([]), // ['internship', 'placement', 'job'...]
  
  // High level overview
  headline: varchar('headline', { length: 300 }).default(''),
  summary: text('summary').default(''),
  
  // Normalized contact details (can be hidden on public website individually)
  contactInfo: jsonb('contact_info').$type<{
    email?: string;
    phone?: string;
    location?: string;
    pronouns?: string;
  }>().default({}),
  
  socialLinks: jsonb('social_links').$type<{
    linkedin?: string;
    github?: string;
    portfolio?: string;
    twitter?: string;
    orcid?: string;
    googleScholar?: string;
    other?: string[];
  }>().default({}),
  
  schemaVersion: varchar('schema_version', { length: 20 }).default('1.0.0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 3. EDUCATION ENTRIES
 */
export const education = pgTable('education', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  institution: varchar('institution', { length: 255 }).notNull(),
  degree: varchar('degree', { length: 200 }).notNull(),
  fieldOfStudy: varchar('field_of_study', { length: 200 }).default(''),
  startDate: varchar('start_date', { length: 50 }), // e.g. "2021-08" or "2021"
  endDate: varchar('end_date', { length: 50 }),
  isCurrent: boolean('is_current').default(false).notNull(),
  gradeType: varchar('grade_type', { length: 50 }), // 'cgpa', 'gpa', 'percentage', 'none'
  gradeValue: varchar('grade_value', { length: 50 }), // '8.75/10', '82%', etc.
  location: varchar('location', { length: 150 }),
  highlights: jsonb('highlights').$type<string[]>().default([]),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 4. EXPERIENCE ENTRIES (Internships, full-time, research, freelancing, volunteering)
 */
export const experiences = pgTable('experiences', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // 'internship', 'job', 'research', 'freelance', 'volunteering'
  organization: varchar('organization', { length: 255 }).notNull(),
  role: varchar('role', { length: 200 }).notNull(),
  location: varchar('location', { length: 150 }),
  startDate: varchar('start_date', { length: 50 }),
  endDate: varchar('end_date', { length: 50 }),
  isCurrent: boolean('is_current').default(false).notNull(),
  bullets: jsonb('bullets').$type<string[]>().default([]),
  technologies: jsonb('technologies').$type<string[]>().default([]),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 5. PROJECTS
 */
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  role: varchar('role', { length: 200 }).default(''),
  startDate: varchar('start_date', { length: 50 }),
  endDate: varchar('end_date', { length: 50 }),
  url: varchar('url', { length: 500 }),
  repoUrl: varchar('repo_url', { length: 500 }),
  bullets: jsonb('bullets').$type<string[]>().default([]),
  toolsUsed: jsonb('tools_used').$type<string[]>().default([]),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 6. SKILLS
 */
export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(), // 'Programming Languages', 'Frameworks', 'Tools', etc.
  items: jsonb('items').$type<{ name: string; proficiency?: string }[]>().default([]),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 7. PUBLICATIONS (Critical for Academic CVs)
 */
export const publications = pgTable('publications', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  authors: jsonb('authors').$type<string[]>().default([]),
  venue: varchar('venue', { length: 255 }).default(''), // Journal, Conference name
  publicationDate: varchar('publication_date', { length: 50 }),
  doiOrUrl: varchar('doi_or_url', { length: 500 }),
  summary: text('summary').default(''),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 8. ACHIEVEMENTS & CERTIFICATIONS
 */
export const achievements = pgTable('achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  issuerOrOrg: varchar('issuer_or_org', { length: 200 }),
  date: varchar('date', { length: 50 }),
  description: text('description').default(''),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const certifications = pgTable('certifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  issuer: varchar('issuer', { length: 200 }).notNull(),
  issueDate: varchar('issue_date', { length: 50 }),
  url: varchar('url', { length: 500 }),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 9. CUSTOM SECTIONS
 */
export const customSections = pgTable('custom_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => masterProfiles.id, { onDelete: 'cascade' }),
  sectionTitle: varchar('section_title', { length: 150 }).notNull(),
  entries: jsonb('entries').$type<{
    title: string;
    subtitle?: string;
    date?: string;
    description?: string;
    bullets?: string[];
  }[]>().default([]),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 10. DOCUMENTS (Resume / Academic CV)
 * Completely autonomous copy with independent sections.
 */
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'resume' | 'cv'
  templateId: varchar('template_id', { length: 100 }).notNull(), // 'ats_single_column' | 'modern_professional' | 'academic_cv'
  accentColor: varchar('accent_color', { length: 20 }).default('#1A1A1A').notNull(),
  targetRole: varchar('target_role', { length: 200 }),
  isArchived: boolean('is_archived').default(false).notNull(),
  schemaVersion: varchar('schema_version', { length: 20 }).default('1.0.0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 11. DOCUMENT SECTIONS
 */
export const documentSections = pgTable('document_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  sectionType: varchar('section_type', { length: 100 }).notNull(), // 'header', 'education', 'experience', 'projects', 'skills', etc.
  title: varchar('title', { length: 150 }).notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  content: jsonb('content').notNull(), // Structured document data for this section
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 12. WEBSITES (Public personal website configuration)
 */
export const websites = pgTable('websites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' })
    .unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  isPublished: boolean('is_published').default(false).notNull(),
  palette: varchar('palette', { length: 50 }).default('mist').notNull(), // 'mist' | 'wine' | 'ink' | 'forest'
  
  // Strict field-visibility whitelist configuration
  // EVERYTHING is false by default.
  fieldVisibility: jsonb('field_visibility').$type<{
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    showSocialLinks: Record<string, boolean>;
    showEducation: boolean;
    showExperience: boolean;
    showProjects: boolean;
    showSkills: boolean;
    showAchievements: boolean;
    showCertifications: boolean;
    showPublications: boolean;
    showDownloadResume: boolean;
    visibleProjectIds?: string[];
    visibleExperienceIds?: string[];
  }>().default({
    showEmail: false,
    showPhone: false,
    showLocation: false,
    showSocialLinks: {},
    showEducation: true,
    showExperience: true,
    showProjects: true,
    showSkills: true,
    showAchievements: false,
    showCertifications: false,
    showPublications: false,
    showDownloadResume: false,
  }).notNull(),

  customHeadline: varchar('custom_headline', { length: 300 }),
  customBio: text('custom_bio'),
  schemaVersion: varchar('schema_version', { length: 20 }).default('1.0.0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 13. AI USAGE LOGS (Per-user daily rate limiting & token audit)
 */
export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  actionType: varchar('action_type', { length: 100 }).notNull(), // 'rewrite_bullet', 'fix_grammar', 'make_concise', etc.
  promptTokens: integer('prompt_tokens').default(0),
  completionTokens: integer('completion_tokens').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
