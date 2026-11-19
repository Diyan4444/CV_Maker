import { GroupFormConfig, StepConfig } from './types';
import { CS_IT_STEPS } from './engineering';

/**
 * Science / Research Base Steps (Step 4 Verbatim Bullets):
 * - Research interests.
 * - Laboratory experience.
 * - Research methodology.
 * - Instruments and tools.
 * - Experiments.
 * - Publications. (Covered in Publications)
 * - Conferences. (Covered in Achievements / Custom sections)
 * - Presentations. (Covered in Achievements / Custom sections)
 * - Research projects. (Covered in Projects)
 * - Scientific software.
 */
export const SCIENCE_BASE_STEPS: StepConfig[] = [
  {
    stepId: 'academic_identity',
    stepTitle: 'Academic Background',
    fields: [
      {
        id: 'degree',
        label: 'Degree',
        type: 'text',
        suggestions: ['B.Sc', 'B.Sc (Hons)', 'M.Sc', 'BS-MS Dual Degree', 'PhD'],
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
    stepTitle: 'Science / Research',
    fields: [
      {
        id: 'research_interests',
        label: 'Research interests',
        type: 'tags',
        helperText: 'Core scientific domain, experimental questions, or theoretical interests.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'research_methodology',
        label: 'Research methodology',
        type: 'tags',
        helperText: 'Experimental methodologies, statistical modeling, or trial designs.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'instruments_and_tools',
        label: 'Instruments and tools',
        type: 'tags',
        helperText: 'Spectrophotometers, chromatography, microscopes, or specialized bench apparatus.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'laboratory_experience',
        label: 'Laboratory experience',
        type: 'tags',
        helperText: 'Bench skills, wet lab assays, biological culture, or synthesis protocols.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'scientific_software',
        label: 'Scientific software',
        type: 'tags',
        helperText: 'Data plotting, molecular visualization, or computational modeling software.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
];

export const SCIENCE_CONFIG: GroupFormConfig = {
  groupId: 'science',
  groupLabel: 'Science',
  baseSteps: SCIENCE_BASE_STEPS,
  specializationOverrides: {
    // Computer Science and Data Science under Science mapped to CS / IT set
    'Computer Science': CS_IT_STEPS,
    'Data Science': CS_IT_STEPS,
  },
};
