export interface ExperienceDiscoveryPrompt {
  id: string;
  category: string;
  title: string; // Verbatim quote from Step 5 bullet
  helperText: string;
  suggestedSection: 'experiences' | 'projects' | 'achievements' | 'certifications';
  suggestedType?: 'volunteering' | 'job' | 'research' | 'freelance' | 'internship';
}

/**
 * All 16 items verbatim from docs/PRODUCT_VISION.md Step 5: Experience discovery:
 * Ask whether they have participated in:
 * - College clubs and societies.
 * - Hackathons.
 * - Competitions.
 * - Student councils.
 * - Event organization.
 * - Volunteering.
 * - Open-source programs.
 * - Personal projects.
 * - Research activities.
 * - Workshops.
 * - Internships.
 * - Freelance work.
 * - Entrepreneurship.
 * - Leadership positions.
 * - Online courses.
 * - Community initiatives.
 */
export const VERBATIM_DISCOVERY_ITEMS = [
  'College clubs and societies.',
  'Hackathons.',
  'Competitions.',
  'Student councils.',
  'Event organization.',
  'Volunteering.',
  'Open-source programs.',
  'Personal projects.',
  'Research activities.',
  'Workshops.',
  'Internships.',
  'Freelance work.',
  'Entrepreneurship.',
  'Leadership positions.',
  'Online courses.',
  'Community initiatives.',
] as const;

export const DISCOVERY_PROMPTS: ExperienceDiscoveryPrompt[] = [
  {
    id: 'college_clubs_and_societies',
    category: 'Clubs & Societies',
    title: 'College clubs and societies.',
    helperText: 'Membership, committee, or core team contributions demonstrate initiative.',
    suggestedSection: 'experiences',
    suggestedType: 'volunteering',
  },
  {
    id: 'hackathons',
    category: 'Competitions & Hackathons',
    title: 'Hackathons.',
    helperText: 'Prototyping a solution under a deadline demonstrates problem-solving.',
    suggestedSection: 'projects',
  },
  {
    id: 'competitions',
    category: 'Competitions & Challenges',
    title: 'Competitions.',
    helperText: 'Academic, technical, case study, or creative challenges.',
    suggestedSection: 'achievements',
  },
  {
    id: 'student_councils',
    category: 'Governance & Representation',
    title: 'Student councils.',
    helperText: 'Class representation, student governance, or departmental bodies.',
    suggestedSection: 'experiences',
    suggestedType: 'volunteering',
  },
  {
    id: 'event_organization',
    category: 'Management & Logistics',
    title: 'Event organization.',
    helperText: 'Planning festivals, symposiums, guest lectures, or logistics.',
    suggestedSection: 'experiences',
    suggestedType: 'volunteering',
  },
  {
    id: 'volunteering',
    category: 'Service & Outreach',
    title: 'Volunteering.',
    helperText: 'Social impact, campus drives, tutoring, or civic volunteering.',
    suggestedSection: 'experiences',
    suggestedType: 'volunteering',
  },
  {
    id: 'open_source_programs',
    category: 'Open Source',
    title: 'Open-source programs.',
    helperText: 'Contributions to open repos, documentation, or community software.',
    suggestedSection: 'projects',
  },
  {
    id: 'personal_projects',
    category: 'Independent Work',
    title: 'Personal projects.',
    helperText: 'Independent exploratory projects built out of curiosity.',
    suggestedSection: 'projects',
  },
  {
    id: 'research_activities',
    category: 'Academic Research',
    title: 'Research activities.',
    helperText: 'Independent research, literature reviews, or lab work.',
    suggestedSection: 'experiences',
    suggestedType: 'research',
  },
  {
    id: 'workshops',
    category: 'Skills & Training',
    title: 'Workshops.',
    helperText: 'Hands-on training, bootcamps, or technical masterclasses.',
    suggestedSection: 'achievements',
  },
  {
    id: 'internships',
    category: 'Work Experience',
    title: 'Internships.',
    helperText: 'Formal, informal, virtual, or project internships.',
    suggestedSection: 'experiences',
    suggestedType: 'internship',
  },
  {
    id: 'freelance_work',
    category: 'Independent Work',
    title: 'Freelance work.',
    helperText: 'Client commissions, design gigs, consulting, or small contracts.',
    suggestedSection: 'experiences',
    suggestedType: 'freelance',
  },
  {
    id: 'entrepreneurship',
    category: 'Venture & Initiative',
    title: 'Entrepreneurship.',
    helperText: 'Founding or co-founding a startup, venture, or student business.',
    suggestedSection: 'experiences',
    suggestedType: 'job',
  },
  {
    id: 'leadership_positions',
    category: 'Leadership',
    title: 'Leadership positions.',
    helperText: 'Head of delegation, captain, team lead, or coordinator roles.',
    suggestedSection: 'experiences',
    suggestedType: 'volunteering',
  },
  {
    id: 'online_courses',
    category: 'Certifications & Courses',
    title: 'Online courses.',
    helperText: 'Completed credentialed or audit courses from reputable platforms.',
    suggestedSection: 'certifications',
  },
  {
    id: 'community_initiatives',
    category: 'Community',
    title: 'Community initiatives.',
    helperText: 'Peer mentoring, neighborhood projects, or local drives.',
    suggestedSection: 'experiences',
    suggestedType: 'volunteering',
  },
];
