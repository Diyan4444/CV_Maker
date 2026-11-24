import { describe, it, expect } from 'vitest';
import * as legalConfig from '../config/legal';
import { checkLegalConfig } from '../../scripts/check-legal';

describe('Legal Configuration and Checker', () => {
  it('exports required legal constants from src/config/legal.ts', () => {
    expect(legalConfig).toHaveProperty('OPERATOR_NAME');
    expect(legalConfig).toHaveProperty('CONTACT_EMAIL');
    expect(legalConfig).toHaveProperty('DATABASE_REGION_LABEL', 'Tokyo, Japan');
    expect(legalConfig).toHaveProperty('EFFECTIVE_DATE');
    expect(legalConfig).toHaveProperty('PRIVACY_VERSION');
  });

  it('fails checkLegalConfig on placeholder values in default config', () => {
    const res = checkLegalConfig();
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('OPERATOR_NAME'))).toBe(true);
    expect(res.errors.some((e) => e.includes('CONTACT_EMAIL'))).toBe(true);
  });

  it('passes checkLegalConfig when all values are properly configured', () => {
    const validConfig = {
      OPERATOR_NAME: 'Quillfolio Inc.',
      CONTACT_EMAIL: 'support@quillfolio.example.com',
      DATABASE_REGION_LABEL: 'Tokyo, Japan',
      EFFECTIVE_DATE: '2026-11-23',
      PRIVACY_VERSION: '1.0.0',
    };
    const res = checkLegalConfig(validConfig);
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('fails checkLegalConfig if any required value is empty or missing', () => {
    const invalidConfig = {
      OPERATOR_NAME: 'Quillfolio',
      CONTACT_EMAIL: '',
      DATABASE_REGION_LABEL: 'Tokyo, Japan',
      EFFECTIVE_DATE: '2026-11-23',
      PRIVACY_VERSION: '1.0.0',
    };
    const res = checkLegalConfig(invalidConfig);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes('CONTACT_EMAIL'))).toBe(true);
  });
});
