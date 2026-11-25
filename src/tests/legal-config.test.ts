import { describe, it, expect } from 'vitest';
import * as legalConfig from '../config/legal';
import { checkLegalConfig } from '../../scripts/check-legal';
import { assertLegalConfigForProduction } from '../lib/legal/production-check';

describe('Legal Configuration and Checker', () => {
  it('exports required legal constants from src/config/legal.ts', () => {
    expect(legalConfig).toHaveProperty('OPERATOR_NAME', 'Diyan Shah');
    expect(legalConfig).toHaveProperty('CONTACT_EMAIL', 'diyanshah2301@gmail.com');
    expect(legalConfig).toHaveProperty('DATABASE_REGION_LABEL', 'Tokyo, Japan');
    expect(legalConfig).toHaveProperty('EFFECTIVE_DATE');
    expect(legalConfig).toHaveProperty('PRIVACY_VERSION');
  });

  it('passes checkLegalConfig on the actual configured src/config/legal.ts', () => {
    const res = checkLegalConfig();
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('fails checkLegalConfig when placeholder REPLACE_ME values are present', () => {
    const res = checkLegalConfig({
      OPERATOR_NAME: 'REPLACE_ME',
      CONTACT_EMAIL: 'REPLACE_ME',
      DATABASE_REGION_LABEL: 'Tokyo, Japan',
      EFFECTIVE_DATE: '2026-11-23',
      PRIVACY_VERSION: '1.0.0',
    });
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

describe('Production Build Legal Guard (VERCEL_ENV=production)', () => {
  it('does NOT throw on local or preview builds even when REPLACE_ME is present', () => {
    const placeholderConfig = {
      OPERATOR_NAME: 'REPLACE_ME',
      CONTACT_EMAIL: 'REPLACE_ME',
    };
    expect(() =>
      assertLegalConfigForProduction({ VERCEL_ENV: undefined }, placeholderConfig)
    ).not.toThrow();
    expect(() =>
      assertLegalConfigForProduction({ VERCEL_ENV: 'preview' }, placeholderConfig)
    ).not.toThrow();
    expect(() =>
      assertLegalConfigForProduction({ VERCEL_ENV: 'development' }, placeholderConfig)
    ).not.toThrow();
  });

  it('throws a clear error when VERCEL_ENV=production and REPLACE_ME is present', () => {
    const placeholderConfig = {
      OPERATOR_NAME: 'REPLACE_ME',
      CONTACT_EMAIL: 'diyanshah2301@gmail.com',
    };
    expect(() =>
      assertLegalConfigForProduction({ VERCEL_ENV: 'production' }, placeholderConfig)
    ).toThrow(/VERCEL_ENV=production.*OPERATOR_NAME="REPLACE_ME"/);
  });

  it('passes when VERCEL_ENV=production and actual legal config is valid', () => {
    expect(() =>
      assertLegalConfigForProduction({ VERCEL_ENV: 'production' }, legalConfig)
    ).not.toThrow();
  });
});
