import * as legalConfig from '../src/config/legal';

export interface CheckLegalResult {
  ok: boolean;
  errors: string[];
}

export function checkLegalConfig(config: Record<string, unknown> = legalConfig): CheckLegalResult {
  const errors: string[] = [];
  const requiredKeys = [
    'OPERATOR_NAME',
    'CONTACT_EMAIL',
    'DATABASE_REGION_LABEL',
    'EFFECTIVE_DATE',
    'PRIVACY_VERSION',
  ];

  for (const key of requiredKeys) {
    const val = config[key];
    if (typeof val !== 'string' || val.trim() === '') {
      errors.push(`Missing or empty required legal config: ${key}`);
    } else if (val.includes('REPLACE_ME')) {
      errors.push(`Legal config key "${key}" contains placeholder "REPLACE_ME" (value: "${val}")`);
    }
  }

  // Also check any extra keys
  for (const [key, val] of Object.entries(config)) {
    if (!requiredKeys.includes(key) && typeof val === 'string' && val.includes('REPLACE_ME')) {
      errors.push(`Legal config key "${key}" contains placeholder "REPLACE_ME" (value: "${val}")`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function runLegalCheck(): boolean {
  const result = checkLegalConfig();
  if (!result.ok) {
    console.error('Legal configuration check FAILED:');
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
    console.error('\nPlease update src/config/legal.ts with actual values before deployment.');
    return false;
  }
  console.log('Legal configuration check PASSED: all values are configured.');
  return true;
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const ok = runLegalCheck();
  process.exit(ok ? 0 : 1);
}
