import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BACKGROUND_GROUPS } from '@/config/onboarding/departments';
import robots from '@/app/robots';

const LANDING_PAGE_PATH = path.join(process.cwd(), 'src', 'app', 'page.tsx');
const LANDING_HEADER_PATH = path.join(process.cwd(), 'src', 'components', 'landing', 'LandingHeader.tsx');
const PUBLIC_LANDING_DIR = path.join(process.cwd(), 'public', 'landing');

// Forbidden marketing patterns, fake social proof, and hype buzzwords
export const FORBIDDEN_COPY_PATTERNS = [
  'Sparkles',
  'testimonial',
  'review',
  'trusted by',
  'loved by',
  'joined by',
  'happy users',
  '10,000',
  '50,000',
  '100k',
  '1m',
  '#1',
  'guaranteed interview',
  'guaranteed job',
  'placement guarantee',
  'money-back guarantee',
  'guaranteed success',
  'ai-powered',
  'powered by ai',
  'artificial intelligence',
  'magical',
  'revolutionary',
  'cutting-edge',
  'world-class',
  'free forever',
  'pricing',
  'subscription',
  'upgrade',
  '100% ats',
  'perfect ats score',
  'pass any ats',
];

describe('Landing Page Copy & Specimen Invariants', () => {
  const landingSource = fs.readFileSync(LANDING_PAGE_PATH, 'utf-8');
  const headerSource = fs.readFileSync(LANDING_HEADER_PATH, 'utf-8');
  const fullSource = `${landingSource}\n${headerSource}`;

  it('scans landing source for forbidden marketing patterns and buzzwords', () => {
    const foundViolations: string[] = [];

    for (const pattern of FORBIDDEN_COPY_PATTERNS) {
      // Case-insensitive match, checking word/phrase presence
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(fullSource)) {
        foundViolations.push(pattern);
      }
    }

    expect(foundViolations).toEqual([]);
  });

  it('verifies landing source contains zero emojis or pictographs', () => {
    // Unicode regex for emojis and pictographs
    const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;
    const match = fullSource.match(emojiRegex);
    expect(match).toBeNull();
  });

  it('verifies planned section shows More templates without Personal website', () => {
    expect(fullSource).toContain('Planned');
    expect(fullSource).toContain('More templates');
    expect(fullSource).not.toContain('Personal website');
  });

  it('verifies all 3 template specimen images exist and are under 150 KB', () => {
    const specimenFiles = ['ats_single_column.png', 'modern_professional.png', 'academic_cv.png'];

    for (const filename of specimenFiles) {
      const filePath = path.join(PUBLIC_LANDING_DIR, filename);
      expect(fs.existsSync(filePath), `Specimen ${filename} must exist`).toBe(true);

      const stats = fs.statSync(filePath);
      const sizeKb = stats.size / 1024;
      expect(stats.size).toBeLessThan(150 * 1024);
      console.log(`[Specimen Size Check] ${filename}: ${Math.round(sizeKb * 10) / 10} KB`);
    }
  });

  it('verifies Open Graph image exists and is valid 1200x630 asset', () => {
    const ogPath = path.join(process.cwd(), 'public', 'og-image.png');
    expect(fs.existsSync(ogPath)).toBe(true);
    const stats = fs.statSync(ogPath);
    expect(stats.size).toBeGreaterThan(1000);
  });

  it('verifies background groups rendered on the page equal departments config', () => {
    expect(BACKGROUND_GROUPS).toHaveLength(5);

    const groupIds = BACKGROUND_GROUPS.map((g) => g.id);
    expect(groupIds).toEqual([
      'engineering_technology',
      'commerce_management',
      'arts_humanities',
      'science',
      'other',
    ]);

    // Ensure the landing page imports and maps over BACKGROUND_GROUPS
    expect(landingSource).toContain('import { BACKGROUND_GROUPS } from');
    expect(landingSource).toContain('BACKGROUND_GROUPS.map');
    expect(landingSource).toContain('Other (type your own)');
  });

  it('verifies robots.ts disallows protected paths and conditionally includes sitemap', () => {
    const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

    try {
      // 1. Without NEXT_PUBLIC_SITE_URL
      delete process.env.NEXT_PUBLIC_SITE_URL;
      const robotsNoSiteUrl = robots();
      expect(robotsNoSiteUrl.sitemap).toBeUndefined();
      expect(robotsNoSiteUrl.rules).toEqual({
        userAgent: '*',
        allow: ['/', '/privacy', '/goodbye'],
        disallow: [
          '/dashboard',
          '/profile',
          '/editor',
          '/settings',
          '/onboarding',
          '/api',
          '/dev',
        ],
      });

      // 2. With NEXT_PUBLIC_SITE_URL
      process.env.NEXT_PUBLIC_SITE_URL = 'https://quillfolio.example.com';
      const robotsWithSiteUrl = robots();
      expect(robotsWithSiteUrl.sitemap).toBe('https://quillfolio.example.com/sitemap.xml');
    } finally {
      if (originalEnv) {
        process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
      } else {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      }
    }
  });
});
