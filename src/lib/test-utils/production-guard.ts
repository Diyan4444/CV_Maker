import fs from 'node:fs';
import path from 'node:path';

/**
 * Production Safety Guard
 *
 * Verifies that the Supabase project ref targeted by tests/scripts appears in a local,
 * git-ignored `.test-projects` allowlist file before any operations using
 * SUPABASE_SERVICE_ROLE_KEY (e.g. creating/deleting users) are executed.
 */
export function assertTestProjectRefAllowed(supabaseUrl?: string): string {
  const url = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('[SECURITY GUARD] NEXT_PUBLIC_SUPABASE_URL is missing. Execution aborted.');
  }

  let projectRef = '';
  try {
    const parsed = new URL(url);
    projectRef = parsed.hostname.split('.')[0];
  } catch (err: any) {
    throw new Error(`[SECURITY GUARD] Invalid Supabase URL "${url}": ${err.message}`);
  }

  const allowlistPath = path.resolve(process.cwd(), '.test-projects');
  if (!fs.existsSync(allowlistPath)) {
    throw new Error(
      `[SECURITY GUARD] Aborting: Local allowlist file "${allowlistPath}" does not exist. ` +
        `Create this file and add your authorized dev/staging project ref(s) to run tests safely.`
    );
  }

  const fileContent = fs.readFileSync(allowlistPath, 'utf8');
  const allowedRefs = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (!allowedRefs.includes(projectRef)) {
    throw new Error(
      `[SECURITY GUARD] ABORTED: Supabase project ref "${projectRef}" is NOT present in .test-projects allowlist. ` +
        `Automated tests and user-manipulation scripts must NEVER run against production!`
    );
  }

  return projectRef;
}
