import { describe, it, expect } from 'vitest';
import { SECTION_EMPTY_STATE_COPY } from '@/components/editor/SectionEmptyState';
import { SectionType } from '@/lib/documents/types';
import { wcagContrast as contrastRatio } from 'culori';

const ALL_SECTION_TYPES: SectionType[] = [
  'header',
  'summary',
  'education',
  'experience',
  'projects',
  'skills',
  'publications',
  'achievements',
  'certifications',
  'custom',
];

describe('Phase 8E-2 Empty States & Three-Level Contrast', () => {
  it('provides icon, title, description, helper, and addLabel for all 10 section types', () => {
    for (const type of ALL_SECTION_TYPES) {
      const copy = SECTION_EMPTY_STATE_COPY[type];
      expect(copy).toBeDefined();
      expect(copy.title.trim().length).toBeGreaterThan(0);
      expect(copy.description.trim().length).toBeGreaterThan(0);
      expect(copy.helper.trim().length).toBeGreaterThan(0);
      expect(copy.addLabel.trim().startsWith('+ Add')).toBe(true);
      expect(copy.icon).toBeDefined();
      // No fake example names
      expect(copy.helper).not.toMatch(/John Doe|Jane Doe|Acme/i);
    }
  });

  it('meets WCAG AA contrast across all three editor visual levels', () => {
    // Level 1: Primary section surface (#FFFDF9) and focused surface (#FBF6F0)
    expect(contrastRatio('#24221F', '#FFFDF9')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#706A63', '#FFFDF9')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#800021', '#FFFDF9')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#24221F', '#FBF6F0')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#706A63', '#FBF6F0')).toBeGreaterThanOrEqual(4.5);

    // Level 2: Secondary tinted surface (#EFE8DE) for entry forms & empty states
    expect(contrastRatio('#24221F', '#EFE8DE')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#800021', '#EFE8DE')).toBeGreaterThanOrEqual(4.5);
    // Primary button on #EFE8DE
    expect(contrastRatio('#FFFFFF', '#800021')).toBeGreaterThanOrEqual(4.5);

    // Level 3: Pure white A4 canvas (#FFFFFF)
    expect(contrastRatio('#0B0B0B', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });
});
