import { GroupFormConfig, StepConfig } from './types';

/**
 * Other Educational and Professional Backgrounds Base Steps (Doc Category E)
 */
export const OTHER_BASE_STEPS: StepConfig[] = [
  {
    stepId: 'academic_identity',
    stepTitle: 'Educational / Professional Foundation',
    fields: [
      {
        id: 'degree',
        label: 'Degree, Trade, or Qualification',
        type: 'text',
        placeholder: 'e.g. LLB, MBBS, B.Arch, Professional Diploma',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'institution',
        label: 'Institution, Firm, or Council',
        type: 'text',
        placeholder: 'e.g. National Law School, Bar Council, Design Studio',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
  {
    stepId: 'core_competencies',
    stepTitle: 'Professional Skills & Practice',
    fields: [
      {
        id: 'professional_tools',
        label: 'Core Skills & Competencies',
        type: 'tags',
        helperText: 'Industry-specific skills, advisory practices, or specialized techniques.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'portfolio_or_work_link',
        label: 'Personal website or professional link',
        type: 'url',
        placeholder: 'https://...',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
];

export const OTHER_CONFIG: GroupFormConfig = {
  groupId: 'other',
  groupLabel: 'Other Educational and Professional Backgrounds',
  baseSteps: OTHER_BASE_STEPS,
};
