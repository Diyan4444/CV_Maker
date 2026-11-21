import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export function computeChecksum(content: string): string {
  // Normalize line endings to ensure identical checksum across Linux/macOS/Windows
  const normalized = content.replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export interface ParsedDbUrl {
  host: string;
  port: string;
  ref: string;
  rawParsed: URL;
}

export function parseDatabaseUrl(urlStr: string): ParsedDbUrl {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch (err: any) {
    throw new Error(`Failed to parse connection URL: ${err.message}`);
  }

  const host = parsed.hostname;
  const port = parsed.port || '5432';
  let ref = '';

  // 1. Check pooler format: username = postgres.<ref>
  if (parsed.username.startsWith('postgres.')) {
    ref = parsed.username.slice('postgres.'.length);
  }
  // 2. Check direct format: hostname = db.<ref>.supabase.co
  else if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
    ref = host.slice(3, -('.supabase.co'.length));
  }
  // 3. Check alternative supabase direct hostname: <ref>.supabase.co
  else if (host.endsWith('.supabase.co')) {
    const parts = host.split('.');
    if (parts.length >= 3) {
      ref = parts[parts.length - 3];
    }
  }

  return { host, port, ref, rawParsed: parsed };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  // (a) Require MIGRATION_DATABASE_URL: no fallback to DATABASE_URL
  const dbUrl = process.env.MIGRATION_DATABASE_URL;
  if (!dbUrl) {
    console.error(
      'ERROR: Missing required environment variable MIGRATION_DATABASE_URL.\n' +
        'db:apply requires MIGRATION_DATABASE_URL pointing to the direct database (port 5432) or session pooler.\n' +
        'Fallback to DATABASE_URL is disabled for migration safety.'
    );
    process.exit(1);
  }

  // (b) Parse and extract ref from direct or pooler format
  let parsedInfo: ParsedDbUrl;
  try {
    parsedInfo = parseDatabaseUrl(dbUrl);
  } catch (err: any) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }

  const { host: targetHost, port: targetPort, ref: targetRef } = parsedInfo;

  // Refuse if ref cannot be determined
  if (!targetRef) {
    console.error(
      `ERROR: Could not determine Supabase project ref from MIGRATION_DATABASE_URL on host "${targetHost}".\n` +
        `Expected format:\n` +
        `  Direct: postgresql://postgres:[password]@db.<project-ref>.supabase.co:5432/postgres\n` +
        `  Pooler: postgresql://postgres.<project-ref>:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
    );
    process.exit(1);
  }

  // Refuse if port is 6543 (transaction pooler)
  if (targetPort === '6543') {
    console.error(
      `ERROR: Port 6543 detected in MIGRATION_DATABASE_URL (host: "${targetHost}").\n` +
        `Port 6543 is the Supabase Transaction Pooler, which does not support schema migrations\n` +
        `(it disallows session-level statements, locks, and prepared statements).\n` +
        `Migrations must run on port 5432 (direct connection or session pooler).`
    );
    process.exit(1);
  }

  // Scan supabase/migrations/*.sql
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  const files = fs.existsSync(migrationsDir)
    ? fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    : [];

  // Handle --dry-run
  if (isDryRun) {
    console.log('[db:apply --dry-run] DRY RUN MODE ENABLED (No database connection made)');
    console.log('[db:apply] Environment Variable: MIGRATION_DATABASE_URL');
    console.log(`[db:apply] Target Host: ${targetHost}`);
    console.log(`[db:apply] Target Port: ${targetPort}`);
    console.log(`[db:apply] Target Project Ref: ${targetRef}`);
    console.log(`[db:apply] Found ${files.length} migration file(s) in numeric order:`);
    for (const f of files) {
      console.log(`  - ${f} (status: unknown)`);
    }
    console.log('[db:apply --dry-run] Dry run completed successfully.');
    process.exit(0);
  }

  // Real execution output and safety check
  console.log(`[db:apply] Target Host: ${targetHost}`);
  console.log(`[db:apply] Target Port: ${targetPort}`);
  console.log(`[db:apply] Target Project Ref: ${targetRef}`);

  // (c) Keep the --confirm-ref requirement
  const confirmRefIdx = process.argv.indexOf('--confirm-ref');
  const confirmedRef = confirmRefIdx !== -1 ? process.argv[confirmRefIdx + 1] : undefined;

  if (!confirmedRef || confirmedRef !== targetRef) {
    console.error(
      `\n[SECURITY REFUSAL] db:apply requires explicit project confirmation.\n` +
        `Refusing to apply migrations to "${targetRef}" on host "${targetHost}".\n` +
        `To confirm and proceed, re-run with:\n` +
        `  npm run db:apply -- --confirm-ref ${targetRef}\n`
    );
    process.exit(1);
  }

  const sql = postgres(dbUrl, {
    max: 1,
    prepare: false,
    ssl: dbUrl.includes('localhost') ? false : 'require',
  });

  try {
    console.log('[db:apply] Connecting to database for migration application...');

    // 1. Ensure app_migrations tracking table exists
    await sql`
      CREATE TABLE IF NOT EXISTS public.app_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 2. Fetch existing applied migrations
    const existingRows = await sql`
      SELECT filename, checksum, applied_at FROM public.app_migrations ORDER BY id ASC;
    `;
    const appliedMap = new Map<string, { checksum: string; applied_at: string }>();
    for (const row of existingRows) {
      appliedMap.set(row.filename, { checksum: row.checksum, applied_at: row.applied_at });
    }

    console.log(`[db:apply] Found ${files.length} migration file(s) in numeric order.\n`);

    let newlyAppliedCount = 0;

    for (const filename of files) {
      const filePath = path.join(migrationsDir, filename);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const currentChecksum = computeChecksum(rawContent);

      const recorded = appliedMap.get(filename);

      if (recorded) {
        // Migration was previously recorded — verify checksum integrity
        if (recorded.checksum !== currentChecksum) {
          throw new Error(
            `\nFATAL: Checksum mismatch for previously applied migration "${filename}"!\n` +
              `  Recorded in DB: ${recorded.checksum}\n` +
              `  Current on disk: ${currentChecksum}\n` +
              `Refusing to proceed: Migration files must be immutable once applied.`
          );
        }
        console.log(`✓ [Already applied] ${filename} (checksum: ${currentChecksum.slice(0, 12)}...)`);
      } else {
        // Apply migration in a dedicated transaction
        console.log(`🚀 [Applying migration] ${filename}...`);
        await sql.begin(async (tx) => {
          await tx.unsafe(rawContent);
          await tx`
            INSERT INTO public.app_migrations (filename, checksum, applied_at)
            VALUES (${filename}, ${currentChecksum}, NOW());
          `;
        });
        console.log(`   Successfully applied ${filename} (checksum: ${currentChecksum.slice(0, 12)}...)\n`);
        newlyAppliedCount++;
      }
    }

    console.log(
      `\n[db:apply] Migration completed. Total: ${files.length} files (${newlyAppliedCount} newly applied, ${
        files.length - newlyAppliedCount
      } up to date).\n`
    );
  } catch (err: any) {
    console.error(`\n[db:apply] Migration FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('apply-migrations.ts') ||
    process.argv[1].endsWith('apply-migrations.js') ||
    process.argv[1].endsWith('apply-migrations'));

if (isDirectRun) {
  main();
}
