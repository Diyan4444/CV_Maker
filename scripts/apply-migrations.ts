import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function computeChecksum(content: string): string {
  // Normalize line endings to ensure identical checksum across Linux/macOS/Windows
  const normalized = content.replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

async function main() {
  const dbUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: Missing MIGRATION_DATABASE_URL or DATABASE_URL environment variable.');
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

    // 3. Scan supabase/migrations/*.sql
    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log(`[db:apply] No migrations directory found at ${migrationsDir}`);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

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

main();
