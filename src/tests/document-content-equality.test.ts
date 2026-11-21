import { describe, it, expect } from 'vitest';
import { isDeepEqual, isDocumentContentEqual } from '@/lib/utils/deep-equal';

describe('Document Content Deterministic Deep Equality', () => {
  const baseMeta = {
    title: 'Senior Software Engineer Resume',
    templateId: 'ats_single_column',
    accentColor: '#800021',
    targetRole: 'Staff Infrastructure Engineer',
    type: 'resume',
  };

  const baseSections = [
    {
      id: 'sec-header',
      sectionType: 'header',
      title: 'Contact Information',
      isVisible: true,
      orderIndex: 0,
      content: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 555-0199',
        city: 'Seattle',
        country: 'USA',
      },
    },
    {
      id: 'sec-experience',
      sectionType: 'experience',
      title: 'Work Experience',
      isVisible: true,
      orderIndex: 1,
      content: {
        entries: [
          {
            id: 'exp-1',
            company: 'Tech Corp',
            role: 'Lead Architect',
            startDate: '2020-01',
            endDate: 'Present',
            bullets: [
              'Designed distributed consensus engine handling 50k rps.',
              'Reduced p99 tail latency by 42% through connection pooling.',
            ],
          },
        ],
      },
    },
  ];

  it('evaluates identical documents as equal', () => {
    const metaCopy = JSON.parse(JSON.stringify(baseMeta));
    const sectionsCopy = JSON.parse(JSON.stringify(baseSections));

    expect(isDocumentContentEqual(baseMeta, baseSections, metaCopy, sectionsCopy)).toBe(true);
  });

  it('ignores key-order differences in meta and nested section contents', () => {
    // Key order inverted in meta
    const reorderedMeta = {
      type: 'resume',
      targetRole: 'Staff Infrastructure Engineer',
      accentColor: '#800021',
      templateId: 'ats_single_column',
      title: 'Senior Software Engineer Resume',
    };

    // Key order inverted inside section content entries and objects
    const reorderedSections = [
      {
        orderIndex: 0,
        isVisible: true,
        title: 'Contact Information',
        sectionType: 'header',
        id: 'sec-header',
        content: {
          country: 'USA',
          city: 'Seattle',
          phone: '+1 555-0199',
          email: 'jane@example.com',
          fullName: 'Jane Doe',
        },
      },
      {
        orderIndex: 1,
        isVisible: true,
        title: 'Work Experience',
        sectionType: 'experience',
        id: 'sec-experience',
        content: {
          entries: [
            {
              bullets: [
                'Designed distributed consensus engine handling 50k rps.',
                'Reduced p99 tail latency by 42% through connection pooling.',
              ],
              endDate: 'Present',
              startDate: '2020-01',
              role: 'Lead Architect',
              company: 'Tech Corp',
              id: 'exp-1',
            },
          ],
        },
      },
    ];

    expect(isDocumentContentEqual(baseMeta, baseSections, reorderedMeta, reorderedSections)).toBe(true);
  });

  it('detects whitespace differences in bullet or text strings as not equal', () => {
    const modifiedSections = JSON.parse(JSON.stringify(baseSections));
    // Added trailing space inside bullet
    modifiedSections[1].content.entries[0].bullets[0] =
      'Designed distributed consensus engine handling 50k rps. ';

    expect(isDocumentContentEqual(baseMeta, baseSections, baseMeta, modifiedSections)).toBe(false);
  });

  it('detects one changed bullet in experience entries as not equal', () => {
    const modifiedSections = JSON.parse(JSON.stringify(baseSections));
    modifiedSections[1].content.entries[0].bullets[1] =
      'Reduced p99 tail latency by 45% through connection pooling.';

    expect(isDocumentContentEqual(baseMeta, baseSections, baseMeta, modifiedSections)).toBe(false);
  });

  it('detects reordered sections as not equal (section order is semantic)', () => {
    const reorderedSections = [baseSections[1], baseSections[0]];

    expect(isDocumentContentEqual(baseMeta, baseSections, baseMeta, reorderedSections)).toBe(false);
  });

  it('detects hidden vs visible section toggle as not equal', () => {
    const toggledSections = JSON.parse(JSON.stringify(baseSections));
    toggledSections[1].isVisible = false;

    expect(isDocumentContentEqual(baseMeta, baseSections, baseMeta, toggledSections)).toBe(false);
  });

  it('detects different accent colors as not equal', () => {
    const modifiedMeta = { ...baseMeta, accentColor: '#0B2B26' };

    expect(isDocumentContentEqual(baseMeta, baseSections, modifiedMeta, baseSections)).toBe(false);
  });

  it('detects different template IDs as not equal', () => {
    const modifiedMeta = { ...baseMeta, templateId: 'modern_professional' };

    expect(isDocumentContentEqual(baseMeta, baseSections, modifiedMeta, baseSections)).toBe(false);
  });

  it('compares primitive and nested structures cleanly with isDeepEqual', () => {
    expect(isDeepEqual({ a: 1, b: [2, 3] }, { b: [2, 3], a: 1 })).toBe(true);
    expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isDeepEqual([1, 2], [2, 1])).toBe(false); // Array order matters
    expect(isDeepEqual(null, undefined)).toBe(false);
    expect(isDeepEqual(null, null)).toBe(true);
  });
});
