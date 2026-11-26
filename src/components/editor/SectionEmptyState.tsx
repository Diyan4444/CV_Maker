'use client';

import React from 'react';
import Link from 'next/link';
import {
  User,
  FileText,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Wrench,
  BookOpen,
  Award,
  BadgeCheck,
  Layers,
  Plus,
  DownloadCloud,
  Loader2,
} from 'lucide-react';
import { SectionType } from '@/lib/documents/types';

interface EmptyStateCopy {
  title: string;
  description: string;
  helper: string;
  addLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SECTION_EMPTY_STATE_COPY: Record<SectionType, EmptyStateCopy> = {
  header: {
    title: 'No contact details yet',
    description: 'Add your name, email, and links for the document header.',
    helper: 'Include your full name, an email address, phone number, city/country, and relevant profile URLs.',
    addLabel: '+ Add Contact Details',
    icon: User,
  },
  summary: {
    title: 'No summary written',
    description: 'Write a short overview of your background and target focus.',
    helper: 'Two to four sentences summarizing your experience level, core domain, and key strengths.',
    addLabel: '+ Add Summary',
    icon: FileText,
  },
  education: {
    title: 'No education entries',
    description: 'List your academic degrees, institutions, and dates.',
    helper: 'Record your degree, field of study, institution name, attendance dates, and optional coursework or GPA.',
    addLabel: '+ Add Education',
    icon: GraduationCap,
  },
  experience: {
    title: 'No experience entries',
    description: 'Add your work history, internships, or research roles.',
    helper: 'Include organization, role title, location, start and end dates, and concise outcome-focused bullet points.',
    addLabel: '+ Add Experience',
    icon: Briefcase,
  },
  projects: {
    title: 'No project entries',
    description: 'Highlight technical, academic, or independent projects.',
    helper: 'Document the project title, your role, dates, tools used, repository or live link, and measurable results.',
    addLabel: '+ Add Project',
    icon: FolderGit2,
  },
  skills: {
    title: 'No skill groups',
    description: 'Organize your technical, language, or domain skills.',
    helper: 'Group related skills by category (for example, programming languages, frameworks, or laboratory methods).',
    addLabel: '+ Add Skill Group',
    icon: Wrench,
  },
  publications: {
    title: 'No publications',
    description: 'List peer-reviewed papers, preprints, or technical reports.',
    helper: 'Include publication title, co-authors, venue or journal, date, and a DOI or link.',
    addLabel: '+ Add Publication',
    icon: BookOpen,
  },
  achievements: {
    title: 'No achievements',
    description: 'Add awards, honors, scholarships, or notable recognitions.',
    helper: 'Record the award title, issuing organization, date received, and a brief note on selection criteria.',
    addLabel: '+ Add Achievement',
    icon: Award,
  },
  certifications: {
    title: 'No certifications',
    description: 'List professional licenses, credentials, and completed certificates.',
    helper: 'Include the credential name, issuing body, issue and expiry dates, and credential ID or URL.',
    addLabel: '+ Add Certification',
    icon: BadgeCheck,
  },
  custom: {
    title: 'No custom entries',
    description: 'Add entries for volunteering, leadership, teaching, or service.',
    helper: 'Each entry supports a title, optional subtitle, date, description, and bullet points.',
    addLabel: '+ Add Entry',
    icon: Layers,
  },
};

interface SectionEmptyStateProps {
  sectionType: SectionType;
  onAdd: () => void;
  onImport: () => void;
  isImporting?: boolean;
  noMasterData?: boolean;
}

export function SectionEmptyState({
  sectionType,
  onAdd,
  onImport,
  isImporting = false,
  noMasterData = false,
}: SectionEmptyStateProps) {
  const copy = SECTION_EMPTY_STATE_COPY[sectionType] || SECTION_EMPTY_STATE_COPY.custom;
  const Icon = copy.icon;

  return (
    <div
      data-testid={`empty-state-${sectionType}`}
      className="rounded-lg border border-dashed border-[#D8D0C5] bg-[#EFE8DE] p-4 sm:p-5 text-center space-y-3"
    >
      <div className="w-9 h-9 rounded-full bg-[#FFFDF9] border border-[#D8D0C5] flex items-center justify-center mx-auto text-[#800021]">
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>

      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-xs font-bold text-[#24221F]">{copy.title}</h3>
        <p className="text-xs text-[#24221F]">{copy.description}</p>
        <p className="text-[11px] text-[#706A63] leading-relaxed">{copy.helper}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={onAdd}
          data-testid={`empty-add-${sectionType}`}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 rounded-md bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{copy.addLabel.replace(/^\+\s*/, '')}</span>
        </button>

        <button
          type="button"
          onClick={onImport}
          disabled={isImporting || noMasterData}
          data-testid={`empty-import-${sectionType}`}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 rounded-md border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#24221F] text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#800021]"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <span>Importing...</span>
            </>
          ) : (
            <>
              <DownloadCloud className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Import from Master Profile</span>
            </>
          )}
        </button>
      </div>

      {noMasterData && (
        <p
          role="status"
          data-testid={`empty-no-master-${sectionType}`}
          className="text-[11px] text-[#706A63] pt-1"
        >
          No entries found in your Master Profile for this section.{' '}
          <Link
            href="/profile"
            className="font-semibold text-[#800021] underline hover:text-[#881144]"
          >
            Add them in Master Profile
          </Link>
        </p>
      )}
    </div>
  );
}
