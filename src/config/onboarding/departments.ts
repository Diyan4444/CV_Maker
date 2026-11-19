export interface SpecializationOption {
  label: string;
  value: string;
}

export interface BackgroundGroupConfig {
  id: string;
  label: string;
  specializations: string[];
}

export const BACKGROUND_GROUPS: BackgroundGroupConfig[] = [
  {
    id: 'engineering_technology',
    label: 'Engineering & Technology',
    specializations: [
      'Computer Science Engineering',
      'Information Technology',
      'Electronics and Telecommunication',
      'Electronics Engineering',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Chemical Engineering',
      'Artificial Intelligence and Data Science',
      'Robotics and Automation',
      'Biotechnology',
    ],
  },
  {
    id: 'commerce_management',
    label: 'Commerce & Management',
    specializations: [
      'B.Com',
      'BBA',
      'MBA',
      'Finance',
      'Accounting',
      'Economics',
      'Marketing',
      'Human Resources',
      'Business Analytics',
      'Entrepreneurship',
      'Banking and Financial Management',
    ],
  },
  {
    id: 'arts_humanities',
    label: 'Arts & Humanities',
    specializations: [
      'English Literature',
      'History',
      'Political Science',
      'Psychology',
      'Sociology',
      'Philosophy',
      'Journalism',
      'Mass Communication',
      'Languages',
      'Fine Arts',
      'Performing Arts',
      'Design',
    ],
  },
  {
    id: 'science',
    label: 'Science',
    specializations: [
      'Physics',
      'Chemistry',
      'Mathematics',
      'Statistics',
      'Biology',
      'Biotechnology',
      'Environmental Science',
      'Computer Science',
      'Data Science',
    ],
  },
  {
    id: 'other',
    label: 'Other',
    specializations: [
      'Diploma and vocational education',
      'Law',
      'Medicine and healthcare',
      'Architecture',
      'Hospitality and tourism',
      'Education and teaching',
      'Research and academia',
      'Freelancing',
      'Creative professionals',
      'Working professionals',
      'Entrepreneurs',
    ],
  },
];

export const CAREER_STAGES = [
  { id: '1st_year', label: '1st Year Student' },
  { id: '2nd_year', label: '2nd Year Student' },
  { id: '3rd_year', label: '3rd Year Student' },
  { id: 'final_year', label: 'Final Year Student' },
  { id: 'recent_graduate', label: 'Recent Graduate' },
  { id: 'working_professional', label: 'Working Professional' },
  { id: 'researcher_academic', label: 'Researcher / Postgraduate / Academic' },
  { id: 'career_changer', label: 'Career Switcher' },
];

export const DOCUMENT_PURPOSES = [
  { id: 'internship', label: 'Internship' },
  { id: 'campus_placement', label: 'Campus Placement' },
  { id: 'full_time_job', label: 'Full-time Industry Job' },
  { id: 'academic_masters_phd', label: 'Higher Studies (Masters / PhD)' },
  { id: 'research_fellowship', label: 'Research Fellowship / Grant' },
  { id: 'freelance_consulting', label: 'Freelancing & Consulting' },
];
