import { describe, it, expect } from 'vitest';
import { containsNonLatinScript, validatePdfTextField } from '../lib/validation/pdf-text';

describe('PDF Text & Non-Latin Warning Validation', () => {
  it('detects pure Latin/English text as clean', () => {
    expect(containsNonLatinScript('Aditya Kshirsagar')).toBe(false);
    expect(containsNonLatinScript('Full Stack Engineer with 3+ years experience')).toBe(false);
    expect(validatePdfTextField('Valid Project Title').valid).toBe(true);
    expect(validatePdfTextField('Valid Project Title').warning).toBeUndefined();
  });

  it('detects Devanagari script and produces plain warning for editor fields', () => {
    expect(containsNonLatinScript('आदित्य क्षीरसागर')).toBe(true);
    expect(containsNonLatinScript('Project name: शोध प्रकल्प')).toBe(true);
    const result = validatePdfTextField('शोध प्रकल्प');
    expect(result.valid).toBe(false);
    expect(result.warning).toContain('Due to PDF font shaping limitations');
  });
});
