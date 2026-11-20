import { describe, it, expect } from 'vitest';
import { sanitizePdfFilename } from '../lib/pdf/filename';

describe('PDF Filename Sanitization', () => {
  it('handles standard names and titles by joining with a hyphen', () => {
    expect(sanitizePdfFilename('John Doe', 'Software Engineer Resume')).toBe(
      'John-Doe-Software-Engineer-Resume.pdf'
    );
  });

  it('keeps accented Latin letters: Nguyễn Văn Đạt', () => {
    expect(sanitizePdfFilename('Nguyễn Văn Đạt', 'Senior Systems Architect')).toBe(
      'Nguyễn-Văn-Đạt-Senior-Systems-Architect.pdf'
    );
  });

  it('keeps accented Polish letters and replaces slashes: Łukasz/Żółć', () => {
    expect(sanitizePdfFilename('Łukasz/Żółć', 'Backend Lead')).toBe(
      'Łukasz-Żółć-Backend-Lead.pdf'
    );
  });

  it('strips illegal characters on Windows/macOS/Linux: \\ / : * ? " < > |', () => {
    const rawName = 'Jane: Doe * [Special? <Version>]';
    const rawTitle = 'Resume | "Draft" / Final';
    const sanitized = sanitizePdfFilename(rawName, rawTitle);
    expect(sanitized).not.toMatch(/[\\/:*?"<>|]/);
    expect(sanitized).toBe('Jane-Doe-Special-Version-Resume-Draft-Final.pdf');
  });

  it('strips emojis and unsupported non-Latin symbols', () => {
    expect(sanitizePdfFilename('Alice Smith 🚀✨', 'Developer Resume 🔥')).toBe(
      'Alice-Smith-Developer-Resume.pdf'
    );
  });

  it('falls back to "resume.pdf" or "cv.pdf" when name and title are empty or stripped', () => {
    expect(sanitizePdfFilename('', '')).toBe('resume.pdf');
    expect(sanitizePdfFilename(null, null, 'resume')).toBe('resume.pdf');
    expect(sanitizePdfFilename(undefined, undefined, 'cv')).toBe('cv.pdf');
    expect(sanitizePdfFilename('🚀✨', '???', 'cv')).toBe('cv.pdf');
    expect(sanitizePdfFilename('   ', '   ', 'resume')).toBe('resume.pdf');
  });

  it('handles name-only or title-only gracefully', () => {
    expect(sanitizePdfFilename('Jane Doe', '')).toBe('Jane-Doe.pdf');
    expect(sanitizePdfFilename('', 'Principal Architect CV', 'cv')).toBe(
      'Principal-Architect-CV.pdf'
    );
  });

  it('truncates filename to max ~100 characters for the basename', () => {
    const veryLongName = 'Alexander'.repeat(15);
    const result = sanitizePdfFilename(veryLongName, 'Resume');
    const baseName = result.replace(/\.pdf$/, '');
    expect(baseName.length).toBeLessThanOrEqual(100);
    expect(result.endsWith('.pdf')).toBe(true);
  });
});
