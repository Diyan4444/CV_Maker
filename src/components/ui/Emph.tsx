import React from 'react';

export interface EmphEntry {
  before: string;
  emph: string;
  after: string;
}

export const EMPH_HEADING_MAP = {
  hero: {
    before: 'A resume builder for people who do the ',
    emph: 'real',
    after: ' work.',
  },
  how_it_works: {
    before: 'How the ',
    emph: 'system',
    after: ' works',
  },
  templates: {
    before: 'Rendered PDF ',
    emph: 'specimens',
    after: '',
  },
  backgrounds: {
    before: 'Built for five ',
    emph: 'disciplines',
    after: '',
  },
  faq: {
    before: 'Plain ',
    emph: 'answers',
    after: ' & limits',
  },
  privacy: {
    before: 'Privacy & Data ',
    emph: 'Rights',
    after: ' Policy',
  },
  dashboard: {
    before: 'Your ',
    emph: 'Documents',
    after: '',
  },
  profile: {
    before: 'Master ',
    emph: 'Profile',
    after: '',
  },
  settings: {
    before: 'Account & ',
    emph: 'Settings',
    after: '',
  },
  onboarding: {
    before: 'What are you ',
    emph: 'building',
    after: ' first?',
  },
} as const satisfies Record<string, EmphEntry>;

export type EmphHeadingKey = keyof typeof EMPH_HEADING_MAP;

interface EmphProps {
  headingKey: EmphHeadingKey;
  onDark?: boolean;
}

/**
 * Renders a hard-coded heading with exactly one emphasized italic Fraunces accent word.
 * Never accepts arbitrary or user-entered text.
 */
export function Emph({ headingKey, onDark = false }: EmphProps) {
  const entry = EMPH_HEADING_MAP[headingKey];
  return (
    <>
      {entry.before}
      <em
        className={`font-display italic font-semibold ${
          onDark ? 'text-[#F7CBCA]' : 'text-[var(--glass-accent)]'
        }`}
      >
        {entry.emph}
      </em>
      {entry.after}
    </>
  );
}
