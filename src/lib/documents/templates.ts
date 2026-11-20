import { TemplateId } from './types';

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  type: 'resume' | 'cv';
  columns: 1 | 2;
  hasTables: boolean;
  hasImages: boolean;
  hasIcons: boolean;
  isSingleColumn: boolean;
  fontFamily: 'Noto Sans' | 'Noto Serif';
}

export const TEMPLATE_DEFINITIONS: Record<TemplateId, TemplateDefinition> = {
  ats_single_column: {
    id: 'ats_single_column',
    name: 'ATS Single Column',
    description: 'Classic linear layout designed for parsing precision across high-volume applicant tracking systems.',
    type: 'resume',
    columns: 1,
    hasTables: false,
    hasImages: false,
    hasIcons: false,
    isSingleColumn: true,
    fontFamily: 'Noto Sans',
  },
  modern_professional: {
    id: 'modern_professional',
    name: 'Modern Professional',
    description: 'Clean structured design featuring clear visual hierarchy, subtle accent lines, and balanced typography.',
    type: 'resume',
    columns: 1,
    hasTables: false,
    hasImages: false,
    hasIcons: false,
    isSingleColumn: true,
    fontFamily: 'Noto Sans',
  },
  academic_cv: {
    id: 'academic_cv',
    name: 'Academic CV',
    description: 'Scholarly multi-page dossier formatted for publications, research experience, teaching, and grants.',
    type: 'cv',
    columns: 1,
    hasTables: false,
    hasImages: false,
    hasIcons: false,
    isSingleColumn: true,
    fontFamily: 'Noto Serif',
  },
};

export function getTemplateDefinition(templateId?: TemplateId | string | null): TemplateDefinition {
  if (templateId && templateId in TEMPLATE_DEFINITIONS) {
    return TEMPLATE_DEFINITIONS[templateId as TemplateId];
  }
  return TEMPLATE_DEFINITIONS.ats_single_column;
}
