import { GroupFormConfig, StepConfig } from './types';

/**
 * Commerce & Management Base Steps (Step 4 Verbatim Bullets):
 * - Financial analysis.
 * - Accounting.
 * - Auditing.
 * - Taxation.
 * - Financial modelling.
 * - Excel and financial tools.
 * - Business case studies. (Covered in Projects)
 * - Internships. (Covered in Experience)
 * - Competitions. (Covered in Achievements / Experience discovery)
 * - Certifications. (Covered in Certifications)
 */
export const COMMERCE_BASE_STEPS: StepConfig[] = [
  {
    stepId: 'academic_identity',
    stepTitle: 'Academic Background',
    fields: [
      {
        id: 'degree',
        label: 'Degree',
        type: 'text',
        suggestions: ['B.Com', 'BBA', 'MBA', 'M.Com', 'PGDM'],
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
    stepTitle: 'Commerce & Management',
    fields: [
      {
        id: 'financial_analysis',
        label: 'Financial analysis',
        type: 'tags',
        helperText: 'Financial statement analysis, ratio analysis, or company valuation.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'accounting_and_taxation',
        label: 'Accounting & Taxation',
        type: 'tags',
        helperText: 'Financial accounting, cost accounting, corporate tax, or auditing.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'excel_and_financial_tools',
        label: 'Excel and financial tools',
        type: 'tags',
        helperText: 'Spreadsheets, financial modelling, or accounting suites.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
];

export const COMMERCE_CONFIG: GroupFormConfig = {
  groupId: 'commerce_management',
  groupLabel: 'Commerce and Management',
  baseSteps: COMMERCE_BASE_STEPS,
  specializationOverrides: {
    /**
     * Commerce / Finance (Step 4 Verbatim Bullets):
     * - Financial analysis.
     * - Accounting.
     * - Auditing.
     * - Taxation.
     * - Financial modelling.
     * - Excel and financial tools.
     * - Business case studies.
     * - Internships.
     * - Competitions.
     * - Certifications.
     */
    Finance: [
      {
        stepId: 'core_competencies',
        stepTitle: 'Commerce / Finance',
        fields: [
          {
            id: 'financial_analysis',
            label: 'Financial analysis',
            type: 'tags',
            helperText: 'Financial statement analysis, valuation, or equity research.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'accounting',
            label: 'Accounting',
            type: 'tags',
            helperText: 'Accounting standards, ledger management, or cost accounting.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'auditing',
            label: 'Auditing',
            type: 'tags',
            helperText: 'Statutory audit, internal audit, or compliance.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'taxation',
            label: 'Taxation',
            type: 'tags',
            helperText: 'Direct tax, indirect tax, GST, or corporate taxation.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'financial_modelling',
            label: 'Financial modelling',
            type: 'tags',
            helperText: 'DCF, LBO, three-statement financial models, or sensitivity analysis.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'excel_and_financial_tools',
            label: 'Excel and financial tools',
            type: 'tags',
            helperText: 'Advanced Excel, Bloomberg, financial dashboards, or specialized tools.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],

    /**
     * Marketing / Management (Step 4 Verbatim Bullets):
     * - Market research.
     * - Digital marketing.
     * - SEO.
     * - Social media campaigns.
     * - Business development.
     * - Strategic planning.
     * - Leadership.
     * - Sales experience.
     * - Case competitions. (Covered in Experience discovery)
     */
    Marketing: [
      {
        stepId: 'core_competencies',
        stepTitle: 'Marketing / Management',
        fields: [
          {
            id: 'market_research',
            label: 'Market research',
            type: 'tags',
            helperText: 'Competitor analysis, customer surveys, or qualitative research.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'digital_marketing',
            label: 'Digital marketing',
            type: 'tags',
            helperText: 'Paid acquisition, content marketing, or performance marketing.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'seo',
            label: 'SEO',
            type: 'tags',
            helperText: 'On-page, off-page, technical SEO, or keyword research.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'social_media_campaigns',
            label: 'Social media campaigns',
            type: 'tags',
            helperText: 'Campaign planning, engagement, or creative copy.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'business_development',
            label: 'Business development',
            type: 'tags',
            helperText: 'Lead generation, partnerships, or client pitching.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'strategic_planning',
            label: 'Strategic planning',
            type: 'tags',
            helperText: 'Go-to-market strategies, business roadmaps, or growth planning.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'leadership',
            label: 'Leadership',
            type: 'tags',
            helperText: 'Team leadership, initiative management, or mentoring.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'sales_experience',
            label: 'Sales experience',
            type: 'tags',
            helperText: 'Direct sales, outbound prospecting, or account handling.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],
  },
};
