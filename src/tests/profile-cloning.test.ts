 
import { describe, it, expect } from 'vitest';
import {
  createDocumentSectionsFromProfile,
  MasterProfileDataset,
} from '@/lib/documents/profile-to-document';

describe('Profile Cloning and Document Independence', () => {
  const mockProfileDataset: MasterProfileDataset = {
    userMeta: {
      fullName: 'Aarav Mehta',
      email: 'aarav@example.com',
    },
    profile: {
      id: 'prof-123',
      preferredName: 'Aarav',
      professionalEmail: 'aarav.pro@example.com',
      phone: '+91 98765 00000',
      currentCity: 'Pune',
      currentCountry: 'India',
      headline: 'Full Stack Engineer',
      summary: 'Passionate developer with 3 years of building cloud applications.',
      linkedinUrl: 'https://linkedin.com/in/aarav',
      githubUrl: 'https://github.com/aarav',
    },
    education: [
      {
        id: 'edu-source-1',
        institution: 'COEP Technological University',
        degree: 'B.Tech',
        fieldOfStudy: 'Computer Engineering',
        startDate: '2019-08',
        endDate: '2023-05',
        grade: '8.8 CGPA',
        bullets: ['Finalist in Smart India Hackathon', 'Head of Open Source Club'],
      },
    ],
    experiences: [
      {
        id: 'exp-source-1',
        type: 'job',
        role: 'Backend Engineer',
        organization: 'Cloud Innovations Ltd',
        location: 'Pune, India',
        startDate: '2023-06',
        endDate: null,
        isCurrent: true,
        bullets: ['Maintained real-time notification engine', 'Reduced Redis memory footprint by 30%'],
        technologies: ['Node.js', 'PostgreSQL', 'Redis'],
      },
    ],
    projects: [
      {
        id: 'proj-source-1',
        title: 'Distributed Log Parser',
        role: 'Creator & Maintainer',
        startDate: '2023-01',
        endDate: '2023-04',
        url: 'https://github.com/aarav/log-parser',
        toolsUsed: ['Go', 'Docker'],
        bullets: ['Streams 50,000 log lines per minute with zero loss.'],
      },
    ],
    skills: [
      {
        id: 'skill-source-1',
        category: 'Programming Languages',
        items: [{ name: 'TypeScript' }, { name: 'Go' }, { name: 'Python' }],
      },
    ],
    certifications: [],
    publications: [
      {
        id: 'pub-source-1',
        title: 'Evaluating Distributed Consensus in Geo-Replicated Environments',
        authors: ['Aarav Mehta', 'Dr. S. Kulkarni'],
        venue: 'IEEE Confluence 2023',
        publicationDate: '2023-01',
        doiOrUrl: '10.1109/sample.123',
        summary: 'Benchmarking latency of Raft under asymmetric network delays.',
      },
    ],
    achievements: [],
    customSections: [],
  };

  it('creates an independent document with cloned sections and stable IDs', () => {
    const documentId = 'doc-test-456';
    const sections = createDocumentSectionsFromProfile(documentId, 'resume', mockProfileDataset);

    expect(sections.length).toBeGreaterThan(0);

    // Header section verification
    const headerSec = sections.find((s) => s.sectionType === 'header');
    expect(headerSec).toBeDefined();
    expect(headerSec?.documentId).toBe(documentId);
    expect(headerSec?.content).toHaveProperty('fullName', 'Aarav Mehta');
    expect(headerSec?.content).toHaveProperty('email', 'aarav.pro@example.com');

    // Experience section & stable sourceId
    const expSec = sections.find((s) => s.sectionType === 'experience');
    expect(expSec).toBeDefined();
    const expEntries = (expSec?.content as any).entries;
    expect(expEntries.length).toBe(1);
    expect(expEntries[0].sourceId).toBe('exp-source-1');
    expect(expEntries[0].role).toBe('Backend Engineer');
    expect(expEntries[0].id).toBeDefined();
    expect(expEntries[0].id).not.toBe('exp-source-1'); // Fresh stable UUID
  });

  it('verifies that mutations to the source dataset DO NOT alter the cloned document', () => {
    const docCopy = createDocumentSectionsFromProfile('doc-test-789', 'resume', mockProfileDataset);
    const expSecBefore = docCopy.find((s) => s.sectionType === 'experience');
    const firstBulletBefore = (expSecBefore?.content as any).entries[0].bullets[0];

    // Mutate source profile in place
    mockProfileDataset.experiences[0].bullets![0] = 'COMPLETELY MUTATED BULLET IN MASTER PROFILE';
    mockProfileDataset.profile!.headline = 'MUTATED HEADLINE';

    // The document copy remains completely unaltered
    const expSecAfter = docCopy.find((s) => s.sectionType === 'experience');
    const firstBulletAfter = (expSecAfter?.content as any).entries[0].bullets[0];
    expect(firstBulletAfter).toBe(firstBulletBefore);
    expect(firstBulletAfter).not.toBe('COMPLETELY MUTATED BULLET IN MASTER PROFILE');
  });

  it('configures publications and research layout when type is academic CV', () => {
    const cvSections = createDocumentSectionsFromProfile('doc-cv-999', 'cv', mockProfileDataset);
    const pubSec = cvSections.find((s) => s.sectionType === 'publications');
    expect(pubSec).toBeDefined();
    expect(pubSec?.isVisible).toBe(true);
    const pubEntries = (pubSec?.content as any).entries;
    expect(pubEntries.length).toBe(1);
    expect(pubEntries[0].title).toContain('Evaluating Distributed Consensus');
  });

  it('never inserts sample or placeholder data when profile sections are empty', () => {
    const emptyDataset: MasterProfileDataset = {
      userMeta: { fullName: 'Empty User', email: 'empty@example.com' },
      profile: null,
      education: [],
      experiences: [],
      projects: [],
      skills: [],
      certifications: [],
      publications: [],
      achievements: [],
      customSections: [],
    };

    const emptyDocSections = createDocumentSectionsFromProfile('doc-empty-1', 'resume', emptyDataset);
    const expSec = emptyDocSections.find((s) => s.sectionType === 'experience');
    expect((expSec?.content as any).entries.length).toBe(0);
    expect(expSec?.isVisible).toBe(false);
  });
});
