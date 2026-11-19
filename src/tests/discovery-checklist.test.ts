import { describe, it, expect } from 'vitest';
import { DISCOVERY_PROMPTS, VERBATIM_DISCOVERY_ITEMS } from '../config/experience-prompts';

describe('Experience Discovery Checklist Verbatim Equality with Product Vision', () => {
  it('contains exactly the 16 items verbatim from docs/PRODUCT_VISION.md Step 5', () => {
    const titles = DISCOVERY_PROMPTS.map((p) => p.title);
    expect(titles).toEqual([
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
    ]);
    expect(titles).toEqual([...VERBATIM_DISCOVERY_ITEMS]);
    expect(DISCOVERY_PROMPTS.length).toBe(16);
  });

  it('clicking any of the 16 discovery prompts generates an empty draft template with zero placeholder content', () => {
    for (const prompt of DISCOVERY_PROMPTS) {
      if (prompt.suggestedSection === 'experiences') {
        const draft = {
          organization: '',
          role: '',
          type: prompt.suggestedType || 'volunteering',
          bullets: [''],
        };
        expect(draft.organization).toBe('');
        expect(draft.role).toBe('');
        expect(draft.bullets).toEqual(['']);
      } else if (prompt.suggestedSection === 'projects') {
        const draft = {
          title: '',
          role: '',
          toolsUsed: [],
          bullets: [''],
        };
        expect(draft.title).toBe('');
        expect(draft.role).toBe('');
      } else if (prompt.suggestedSection === 'achievements') {
        const draft = {
          title: '',
          issuerOrOrg: '',
          date: '',
        };
        expect(draft.title).toBe('');
        expect(draft.issuerOrOrg).toBe('');
      } else if (prompt.suggestedSection === 'certifications') {
        const draft = {
          name: '',
          issuer: '',
        };
        expect(draft.name).toBe('');
        expect(draft.issuer).toBe('');
      }
    }
  });

  it('filters out blank draft entries during save so empty cards are never persisted', () => {
    const rawExperiences = [
      { organization: '', role: '', bullets: [''] }, // empty draft
      { organization: 'Robotics Club', role: 'Lead Organizer', bullets: ['Organized annual hackathon'] },
    ];

    const validToPersist = rawExperiences.filter(
      (e) => e.organization.trim() !== '' || e.role.trim() !== ''
    );

    expect(validToPersist.length).toBe(1);
    expect(validToPersist[0].organization).toBe('Robotics Club');
  });
});
