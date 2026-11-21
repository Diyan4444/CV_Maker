import { describe, it, expect, afterEach } from 'vitest';
import { validateServerEnv, ENV_AUDIT_INVENTORY } from '../lib/env';

describe('Item 8: Server Environment Startup Check & Variable Audit', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('audits all process.env variables with client vs server scope and required status', () => {
    expect(ENV_AUDIT_INVENTORY.length).toBeGreaterThanOrEqual(8);
    const serverVars = ENV_AUDIT_INVENTORY.filter((v) => v.scope === 'server');
    const clientVars = ENV_AUDIT_INVENTORY.filter((v) => v.scope === 'client');
    expect(serverVars.some((v) => v.name === 'SUPABASE_SERVICE_ROLE_KEY')).toBe(true);
    expect(serverVars.some((v) => v.name === 'DATABASE_URL')).toBe(true);
    expect(clientVars.some((v) => v.name === 'NEXT_PUBLIC_SUPABASE_URL')).toBe(true);
  });

  it('passes validation when all required server variables are defined', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'demo-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'demo-service-key';
    process.env.DATABASE_URL = 'postgresql://demo:pass@localhost:6543/postgres';

    expect(() => validateServerEnv()).not.toThrow();
  });

  it('fails with clear error message naming missing required server variables when variables are omitted', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'demo-anon-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.DATABASE_URL;

    expect(() => validateServerEnv()).toThrowError(
      /Missing required server environment variables: SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL/
    );
  });
});
