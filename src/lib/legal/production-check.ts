import * as legalConfig from '../../config/legal';

export function assertLegalConfigForProduction(
  env: Record<string, string | undefined> = process.env,
  config: Record<string, unknown> = legalConfig
): void {
  if (env.VERCEL_ENV !== 'production') {
    return;
  }

  const badKeys: string[] = [];
  for (const [key, val] of Object.entries(config)) {
    if (typeof val === 'string' && val.includes('REPLACE_ME')) {
      badKeys.push(`${key}="${val}"`);
    }
  }

  if (badKeys.length > 0) {
    throw new Error(
      `[Quillfolio Production Build Guard] Refusing to build for Vercel production (VERCEL_ENV=production) because src/config/legal.ts still contains REPLACE_ME placeholder(s): ${badKeys.join(', ')}. Update src/config/legal.ts before deploying to production.`
    );
  }
}
