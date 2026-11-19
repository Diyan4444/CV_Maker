import { GroupFormConfig, StepConfig } from './types';

/**
 * Arts / Humanities Base Steps (Step 4 Verbatim Bullets):
 * - Research interests.
 * - Academic papers. (Covered in Publications / Custom sections)
 * - Writing samples. (Covered in Projects / Links)
 * - Literary analysis.
 * - Fieldwork.
 * - Interviews and surveys.
 * - Editorial experience.
 * - Creative writing.
 * - Publications. (Covered in Publications)
 * - Cultural projects. (Covered in Projects)
 * - Workshops. (Covered in Experience discovery)
 * - Social initiatives. (Covered in Experience discovery / Volunteering)
 */
export const ARTS_BASE_STEPS: StepConfig[] = [
  {
    stepId: 'academic_identity',
    stepTitle: 'Academic Background',
    fields: [
      {
        id: 'degree',
        label: 'Degree',
        type: 'text',
        suggestions: ['BA', 'BA (Hons)', 'MA', 'BFA', 'MFA', 'B.Des', 'PhD'],
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'institution',
        label: 'Institution',
        type: 'text',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'cgpa_percentage',
        label: 'CGPA, GPA, percentage, or equivalent grading system',
        type: 'text',
        helperText: 'Optional. Leave blank if not reported.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
  {
    stepId: 'core_competencies',
    stepTitle: 'Arts / Humanities',
    fields: [
      {
        id: 'research_interests',
        label: 'Research interests',
        type: 'tags',
        helperText: 'Primary thematic interests, cultural studies, or theoretical frameworks.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'fieldwork_interviews',
        label: 'Fieldwork, interviews and surveys',
        type: 'tags',
        helperText: 'Fieldwork experience, qualitative interviews, or survey methodologies.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'writing_and_editorial',
        label: 'Writing, literary analysis & editorial experience',
        type: 'tags',
        helperText: 'Literary analysis, editorial experience, creative writing, or commentary.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
];

export const ARTS_HUMANITIES_CONFIG: GroupFormConfig = {
  groupId: 'arts_humanities',
  groupLabel: 'Arts and Humanities',
  baseSteps: ARTS_BASE_STEPS,
  specializationOverrides: {
    /**
     * Psychology (Step 4 Verbatim Bullets):
     * - Research methodology.
     * - Research projects. (Covered in Projects)
     * - Relevant practical training.
     * - Psychometric tools where applicable.
     * - Workshops. (Covered in Experience discovery)
     * - Academic publications. (Covered in Publications)
     * - Relevant supervised experience.
     */
    Psychology: [
      {
        stepId: 'core_competencies',
        stepTitle: 'Psychology',
        fields: [
          {
            id: 'research_methodology',
            label: 'Research methodology',
            type: 'tags',
            helperText: 'Qualitative or quantitative research design, statistical tools, or experimental protocols.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'psychometric_tools',
            label: 'Psychometric tools where applicable',
            type: 'tags',
            helperText: 'Psychometric testing instruments, inventory administration, or behavioral assessments.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'practical_training',
            label: 'Relevant practical training',
            type: 'tags',
            helperText: 'Clinical observations, counseling skills, lab rotations, or observational methods.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'supervised_experience',
            label: 'Relevant supervised experience',
            type: 'tags',
            helperText: 'Practicum hours, hospital or institutional exposure under licensed supervision.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],

    /**
     * Design / Fine Arts (Step 4 Verbatim Bullets):
     * - Design software.
     * - Creative projects. (Covered in Projects)
     * - Illustration.
     * - Photography.
     * - UI/UX work.
     * - Exhibitions. (Covered in Achievements / Custom sections)
     * - Design competitions. (Covered in Achievements)
     * - Portfolio links.
     * - Creative techniques and specializations.
     */
    Design: [
      {
        stepId: 'core_competencies',
        stepTitle: 'Design / Fine Arts',
        fields: [
          {
            id: 'design_software',
            label: 'Design software',
            type: 'tags',
            helperText: 'Vector illustration, layout design, prototyping, or 3D design software.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'ui_ux_work',
            label: 'UI/UX work',
            type: 'tags',
            helperText: 'Wireframing, design systems, usability testing, or interface design.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'creative_techniques',
            label: 'Creative techniques and specializations',
            type: 'tags',
            helperText: 'Illustration, photography, motion design, or visual brand identity.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'portfolio_links',
            label: 'Portfolio links',
            type: 'url',
            placeholder: 'https://...',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],
    'Fine Arts': [
      {
        stepId: 'core_competencies',
        stepTitle: 'Design / Fine Arts',
        fields: [
          {
            id: 'creative_techniques',
            label: 'Creative techniques and specializations',
            type: 'tags',
            helperText: 'Painting, sculpture, printmaking, illustration, or installation.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'photography_illustration',
            label: 'Photography & Illustration',
            type: 'tags',
            helperText: 'Mediums, visual studies, or studio techniques.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'portfolio_links',
            label: 'Portfolio links',
            type: 'url',
            placeholder: 'https://...',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],
  },
};
