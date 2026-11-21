/**
 * Master Profile to Document Copy Engine
 * Strictly aligned with docs/PRODUCT_VISION.md Sections 4A, 4B, 6 & 9:
 * "Creating a document copies content from the master profile into documents/document_sections (an independent copy).
 * Later master-profile edits must NOT change existing documents.
 * Each entry keeps its own stable id plus a sourceId pointing to the master item.
 * Only use data that exists in the profile tables; NEVER insert placeholder or sample text into a user's document."
 */

import { randomUUID } from 'crypto';
import {
  DocumentSection,
  DocumentType,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SkillEntry,
  PublicationEntry,
  AchievementEntry,
  CertificationEntry,
  CustomEntry,
  HeaderContent,
  SummaryContent,
} from './types';

export interface MasterProfileDataset {
  profile: {
    id: string;
    preferredName?: string | null;
    professionalEmail?: string | null;
    phone?: string | null;
    currentCity?: string | null;
    currentCountry?: string | null;
    linkedinUrl?: string | null;
    githubUrl?: string | null;
    personalWebsiteUrl?: string | null;
    otherLinks?: string[] | null;
    headline?: string | null;
    summary?: string | null;
  } | null;
  userMeta: {
    fullName: string;
    email: string;
  };
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean | null;
    grade?: string | null;
    bullets?: string[] | null;
  }>;
  experiences: Array<{
    id: string;
    type: string;
    organization: string;
    role: string;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean | null;
    bullets?: string[] | null;
    technologies?: string[] | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    role?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    url?: string | null;
    repoUrl?: string | null;
    bullets?: string[] | null;
    toolsUsed?: string[] | null;
  }>;
  skills: Array<{
    id: string;
    category: string;
    items?: Array<{ name: string; proficiency?: string }> | null;
  }>;
  publications: Array<{
    id: string;
    title: string;
    authors?: string[] | null;
    venue?: string | null;
    publicationDate?: string | null;
    doiOrUrl?: string | null;
    summary?: string | null;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    issuer?: string | null;
    date?: string | null;
    description?: string | null;
    url?: string | null;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuingOrg: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    credentialId?: string | null;
    credentialUrl?: string | null;
  }>;
  customSections: Array<{
    id: string;
    title: string;
    entries?: Array<{
      title: string;
      subtitle?: string;
      date?: string;
      description?: string;
      bullets?: string[];
    }> | null;
  }>;
}

export function createDocumentSectionsFromProfile(
  documentId: string,
  docType: DocumentType,
  data: MasterProfileDataset
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const now = new Date().toISOString();
  let order = 0;

  // 1. Header / Contact Section
  const headerContent: HeaderContent = {
    schema_version: '1.0.0',
    fullName: data.userMeta.fullName || data.profile?.preferredName || '',
    preferredName: data.profile?.preferredName || undefined,
    email: data.profile?.professionalEmail || data.userMeta.email,
    phone: data.profile?.phone || undefined,
    city: data.profile?.currentCity || undefined,
    country: data.profile?.currentCountry || undefined,
    linkedinUrl: data.profile?.linkedinUrl || undefined,
    githubUrl: data.profile?.githubUrl || undefined,
    websiteUrl: data.profile?.personalWebsiteUrl || undefined,
    otherLinks: data.profile?.otherLinks ? [...data.profile.otherLinks] : [],
    headline: data.profile?.headline || undefined,
  };

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'header',
    title: 'Header & Contact Information',
    orderIndex: order++,
    isVisible: true,
    content: headerContent,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Summary Section
  const summaryContent: SummaryContent = {
    schema_version: '1.0.0',
    text: data.profile?.summary || '',
  };

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'summary',
    title: docType === 'cv' ? 'Research Interests & Summary' : 'Professional Summary',
    orderIndex: order++,
    isVisible: Boolean(data.profile?.summary && data.profile.summary.trim().length > 0),
    content: summaryContent,
    createdAt: now,
    updatedAt: now,
  });

  // 3. Education Section
  const educationEntries: EducationEntry[] = (data.education || []).map((e) => ({
    id: randomUUID(),
    sourceId: e.id,
    institution: e.institution,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy || undefined,
    startDate: e.startDate || undefined,
    endDate: e.endDate || undefined,
    isCurrent: Boolean(e.isCurrent),
    grade: e.grade || undefined,
    bullets: e.bullets ? [...e.bullets] : [],
  }));

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'education',
    title: 'Education',
    orderIndex: order++,
    isVisible: educationEntries.length > 0,
    content: {
      schema_version: '1.0.0',
      entries: educationEntries,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 4. Experience Section
  // For Academic CV: Sort research entries first
  const sortedExperiences = [...(data.experiences || [])].sort((a, b) => {
    if (docType === 'cv') {
      const aIsResearch = a.type.toLowerCase().includes('research');
      const bIsResearch = b.type.toLowerCase().includes('research');
      if (aIsResearch && !bIsResearch) return -1;
      if (!aIsResearch && bIsResearch) return 1;
    }
    return 0;
  });

  const experienceEntries: ExperienceEntry[] = sortedExperiences.map((e) => ({
    id: randomUUID(),
    sourceId: e.id,
    type: e.type,
    organization: e.organization,
    role: e.role,
    location: e.location || undefined,
    startDate: e.startDate || undefined,
    endDate: e.endDate || undefined,
    isCurrent: Boolean(e.isCurrent),
    bullets: e.bullets ? [...e.bullets] : [],
    technologies: e.technologies ? [...e.technologies] : [],
  }));

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'experience',
    title: docType === 'cv' ? 'Research & Professional Experience' : 'Experience',
    orderIndex: order++,
    isVisible: experienceEntries.length > 0,
    content: {
      schema_version: '1.0.0',
      entries: experienceEntries,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 5. If Academic CV: Publications directly after Experience
  if (docType === 'cv') {
    const pubEntries: PublicationEntry[] = (data.publications || []).map((p) => ({
      id: randomUUID(),
      sourceId: p.id,
      title: p.title,
      authors: p.authors ? [...p.authors] : [],
      venue: p.venue || undefined,
      publicationDate: p.publicationDate || undefined,
      doiOrUrl: p.doiOrUrl || undefined,
      summary: p.summary || undefined,
    }));

    sections.push({
      id: randomUUID(),
      documentId,
      sectionType: 'publications',
      title: 'Publications & Academic Research',
      orderIndex: order++,
      isVisible: pubEntries.length > 0,
      content: {
        schema_version: '1.0.0',
        entries: pubEntries,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  // 6. Projects Section
  const projectEntries: ProjectEntry[] = (data.projects || []).map((p) => ({
    id: randomUUID(),
    sourceId: p.id,
    title: p.title,
    role: p.role || undefined,
    startDate: p.startDate || undefined,
    endDate: p.endDate || undefined,
    url: p.url || undefined,
    repoUrl: p.repoUrl || undefined,
    bullets: p.bullets ? [...p.bullets] : [],
    toolsUsed: p.toolsUsed ? [...p.toolsUsed] : [],
  }));

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'projects',
    title: docType === 'cv' ? 'Academic & Technical Projects' : 'Projects',
    orderIndex: order++,
    isVisible: projectEntries.length > 0,
    content: {
      schema_version: '1.0.0',
      entries: projectEntries,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 7. Skills Section
  const skillEntries: SkillEntry[] = (data.skills || []).map((s) => ({
    id: randomUUID(),
    sourceId: s.id,
    category: s.category,
    items: s.items ? s.items.map((it) => ({ ...it })) : [],
  }));

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'skills',
    title: docType === 'cv' ? 'Skills, Methodologies & Tools' : 'Technical & Core Skills',
    orderIndex: order++,
    isVisible: skillEntries.length > 0,
    content: {
      schema_version: '1.0.0',
      entries: skillEntries,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 8. Achievements Section
  const achievementEntries: AchievementEntry[] = (data.achievements || []).map((a) => ({
    id: randomUUID(),
    sourceId: a.id,
    title: a.title,
    issuer: a.issuer || undefined,
    date: a.date || undefined,
    description: a.description || undefined,
    url: a.url || undefined,
  }));

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'achievements',
    title: docType === 'cv' ? 'Honors, Grants & Academic Awards' : 'Achievements & Honors',
    orderIndex: order++,
    isVisible: achievementEntries.length > 0,
    content: {
      schema_version: '1.0.0',
      entries: achievementEntries,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 9. Certifications Section
  const certificationEntries: CertificationEntry[] = (data.certifications || []).map((c) => ({
    id: randomUUID(),
    sourceId: c.id,
    name: c.name || '',
    issuingOrg: c.issuingOrg || '',
    issueDate: c.issueDate || undefined,
    expiryDate: c.expiryDate || undefined,
    credentialId: c.credentialId || undefined,
    credentialUrl: c.credentialUrl || undefined,
  }));

  sections.push({
    id: randomUUID(),
    documentId,
    sectionType: 'certifications',
    title: 'Certifications & Licenses',
    orderIndex: order++,
    isVisible: certificationEntries.length > 0,
    content: {
      schema_version: '1.0.0',
      entries: certificationEntries,
    },
    createdAt: now,
    updatedAt: now,
  });

  // 10. If Resume: Publications can be added after certifications if present
  if (docType === 'resume' && data.publications && data.publications.length > 0) {
    const pubEntries: PublicationEntry[] = data.publications.map((p) => ({
      id: randomUUID(),
      sourceId: p.id,
      title: p.title,
      authors: p.authors ? [...p.authors] : [],
      venue: p.venue || undefined,
      publicationDate: p.publicationDate || undefined,
      doiOrUrl: p.doiOrUrl || undefined,
      summary: p.summary || undefined,
    }));

    sections.push({
      id: randomUUID(),
      documentId,
      sectionType: 'publications',
      title: 'Publications',
      orderIndex: order++,
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        entries: pubEntries,
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  // 11. Custom Sections
  if (data.customSections && data.customSections.length > 0) {
    for (const cs of data.customSections) {
      const customEntries: CustomEntry[] = (cs.entries || []).map((e) => ({
        id: randomUUID(),
        title: e.title,
        subtitle: e.subtitle,
        date: e.date,
        description: e.description,
        bullets: e.bullets ? [...e.bullets] : [],
      }));

      sections.push({
        id: randomUUID(),
        documentId,
        sectionType: 'custom',
        title: cs.title,
        orderIndex: order++,
        isVisible: customEntries.length > 0,
        content: {
          schema_version: '1.0.0',
          entries: customEntries,
        },
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return sections;
}
