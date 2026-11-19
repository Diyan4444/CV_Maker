import { GroupFormConfig, StepConfig } from './types';

/**
 * Generic Engineering Base Steps (For engineering disciplines without a dedicated override in doc)
 */
export const GENERIC_BASE_STEPS: StepConfig[] = [
  {
    stepId: 'academic_identity',
    stepTitle: 'Academic Background',
    fields: [
      {
        id: 'degree',
        label: 'Degree',
        type: 'text',
        suggestions: ['B.Tech', 'B.E.', 'B.Sc', 'M.Tech', 'M.Sc', 'PhD', 'Diploma'],
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
    stepTitle: 'Technical Competencies & Tools',
    fields: [
      {
        id: 'professional_tools',
        label: 'Tools & Technologies',
        type: 'tags',
        helperText: 'Tools, software, or laboratory instruments used in your discipline.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'competencies_skills',
        label: 'Technical Interests',
        type: 'tags',
        helperText: 'Areas of technical specialization or foundational engineering topics.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
];

/**
 * Computer Science / IT (Step 4 Verbatim Bullets):
 * - Programming languages.
 * - Frameworks and libraries.
 * - Databases.
 * - Development tools.
 * - Technical projects. (Covered in master profile Projects section)
 * - Software architecture experience.
 * - GitHub repositories.
 * - Open-source contributions. (Covered in Projects / Experience discovery)
 * - Hackathons. (Covered in Experience discovery)
 * - Coding competitions. (Covered in Achievements)
 * - Relevant certifications. (Covered in Certifications)
 * - Technical interests.
 */
export const CS_IT_STEPS: StepConfig[] = [
  {
    stepId: 'academic_identity',
    stepTitle: 'Academic Background',
    fields: [
      {
        id: 'degree',
        label: 'Degree',
        type: 'text',
        suggestions: ['B.Tech', 'B.E.', 'BCA', 'MCA', 'M.Tech', 'B.Sc Computer Science', 'M.Sc Computer Science'],
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
    stepTitle: 'Computer Science / IT',
    fields: [
      {
        id: 'programming_languages',
        label: 'Programming languages',
        type: 'tags',
        helperText: 'Programming languages you write code in.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'frameworks_and_libraries',
        label: 'Frameworks and libraries',
        type: 'tags',
        helperText: 'Frameworks and libraries used for development.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'databases',
        label: 'Databases',
        type: 'tags',
        helperText: 'Relational or non-relational database management systems.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'development_tools',
        label: 'Development tools',
        type: 'tags',
        helperText: 'IDEs, build systems, version control, or containerization tools.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'software_architecture_experience',
        label: 'Software architecture experience',
        type: 'tags',
        helperText: 'Design patterns, system architecture concepts, or microservices.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'technical_interests',
        label: 'Technical interests',
        type: 'tags',
        helperText: 'Areas of technical passion or exploration.',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
      {
        id: 'github_profile',
        label: 'GitHub repositories',
        type: 'url',
        placeholder: 'https://github.com/username',
        required: false,
        appliesTo: ['resume', 'cv', 'website'],
      },
    ],
  },
];

export const ENGINEERING_CONFIG: GroupFormConfig = {
  groupId: 'engineering_technology',
  groupLabel: 'Engineering and Technology',
  baseSteps: GENERIC_BASE_STEPS,
  specializationOverrides: {
    // CS / IT
    'Computer Science Engineering': CS_IT_STEPS,
    'Information Technology': CS_IT_STEPS,
    'Artificial Intelligence and Data Science': CS_IT_STEPS,

    /**
     * Mechanical Engineering (Step 4 Verbatim Bullets):
     * - CAD software.
     * - Simulation tools.
     * - Manufacturing processes.
     * - Industrial training. (Covered in Experience)
     * - Mechanical design projects. (Covered in Projects)
     * - Robotics and automation projects. (Covered in Projects)
     * - Workshops. (Covered in Experience discovery)
     * - Technical competitions. (Covered in Experience discovery)
     * - Laboratory experience. (Covered in Experience)
     */
    'Mechanical Engineering': [
      {
        stepId: 'core_competencies',
        stepTitle: 'Mechanical Engineering',
        fields: [
          {
            id: 'cad_software',
            label: 'CAD software',
            type: 'tags',
            helperText: 'Computer-aided design and modeling software.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'simulation_tools',
            label: 'Simulation tools',
            type: 'tags',
            helperText: 'Finite element analysis and computational simulation software.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'manufacturing_processes',
            label: 'Manufacturing processes',
            type: 'tags',
            helperText: 'Machining, casting, welding, additive manufacturing, or fabrication processes.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],

    /**
     * Electrical / Electronics Engineering (Step 4 Verbatim Bullets):
     * - Circuit design.
     * - Embedded systems.
     * - Microcontrollers.
     * - PCB design.
     * - Power systems.
     * - MATLAB and simulation tools.
     * - Hardware projects. (Covered in Projects)
     * - Instrumentation.
     * - Technical laboratories. (Covered in Experience)
     */
    'Electrical Engineering': [
      {
        stepId: 'core_competencies',
        stepTitle: 'Electrical / Electronics Engineering',
        fields: [
          {
            id: 'circuit_design',
            label: 'Circuit design',
            type: 'tags',
            helperText: 'Analog or digital circuit design skills and tools.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'embedded_systems',
            label: 'Embedded systems',
            type: 'tags',
            helperText: 'Embedded programming, RTOS, or embedded architecture.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'microcontrollers',
            label: 'Microcontrollers',
            type: 'tags',
            helperText: 'Microcontroller families and development boards.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'pcb_design',
            label: 'PCB design',
            type: 'tags',
            helperText: 'Schematic capture and printed circuit board layout.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'power_systems',
            label: 'Power systems',
            type: 'tags',
            helperText: 'Power generation, transmission, distribution, or electrical machines.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'matlab_simulation_tools',
            label: 'MATLAB and simulation tools',
            type: 'tags',
            helperText: 'MATLAB, Simulink, and electronic circuit simulation tools.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'instrumentation',
            label: 'Instrumentation',
            type: 'tags',
            helperText: 'Sensors, transducers, measurement equipment, and DAQ.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],
    'Electronics Engineering': [
      {
        stepId: 'core_competencies',
        stepTitle: 'Electrical / Electronics Engineering',
        fields: [
          {
            id: 'circuit_design',
            label: 'Circuit design',
            type: 'tags',
            helperText: 'Analog or digital circuit design skills and tools.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'embedded_systems',
            label: 'Embedded systems',
            type: 'tags',
            helperText: 'Embedded programming, RTOS, or embedded architecture.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'microcontrollers',
            label: 'Microcontrollers',
            type: 'tags',
            helperText: 'Microcontroller families and development boards.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'pcb_design',
            label: 'PCB design',
            type: 'tags',
            helperText: 'Schematic capture and printed circuit board layout.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'matlab_simulation_tools',
            label: 'MATLAB and simulation tools',
            type: 'tags',
            helperText: 'MATLAB, Simulink, and electronic circuit simulation tools.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'instrumentation',
            label: 'Instrumentation',
            type: 'tags',
            helperText: 'Sensors, transducers, measurement equipment, and DAQ.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],
    'Electronics and Telecommunication': [
      {
        stepId: 'core_competencies',
        stepTitle: 'Electrical / Electronics Engineering',
        fields: [
          {
            id: 'circuit_design',
            label: 'Circuit design',
            type: 'tags',
            helperText: 'Analog or digital circuit design skills and tools.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'embedded_systems',
            label: 'Embedded systems',
            type: 'tags',
            helperText: 'Embedded programming, RTOS, or embedded architecture.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'microcontrollers',
            label: 'Microcontrollers',
            type: 'tags',
            helperText: 'Microcontroller families and development boards.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'matlab_simulation_tools',
            label: 'MATLAB and simulation tools',
            type: 'tags',
            helperText: 'MATLAB, Simulink, and electronic circuit simulation tools.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'instrumentation',
            label: 'Instrumentation',
            type: 'tags',
            helperText: 'Sensors, transducers, measurement equipment, and DAQ.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],

    /**
     * Civil Engineering (Step 4 Verbatim Bullets):
     * - Structural design.
     * - Surveying.
     * - Construction management.
     * - AutoCAD.
     * - Revit.
     * - STAAD.Pro.
     * - Site visits. (Covered in Experience)
     * - Industrial training. (Covered in Experience)
     * - Infrastructure projects. (Covered in Projects)
     */
    'Civil Engineering': [
      {
        stepId: 'core_competencies',
        stepTitle: 'Civil Engineering',
        fields: [
          {
            id: 'structural_design',
            label: 'Structural design',
            type: 'tags',
            helperText: 'Structural design principles and codes.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'surveying',
            label: 'Surveying',
            type: 'tags',
            helperText: 'Land surveying, leveling, or total station methods.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'construction_management',
            label: 'Construction management',
            type: 'tags',
            helperText: 'Project planning, estimation, or site execution.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
          {
            id: 'civil_software',
            label: 'Civil Engineering Software',
            type: 'tags',
            helperText: 'AutoCAD, Revit, STAAD.Pro, or equivalent design software.',
            required: false,
            appliesTo: ['resume', 'cv', 'website'],
          },
        ],
      },
    ],
  },
};
