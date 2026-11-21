import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface ParsedDatabaseObjects {
  constraints: string[];
  triggers: string[];
  functions: string[];
  indexes: string[];
  droppedIndexes: string[];
}

function parseSqlFile(sqlContent: string): ParsedDatabaseObjects {
  const constraints = new Set<string>();
  const triggers = new Set<string>();
  const functions = new Set<string>();
  const indexes = new Set<string>();
  const droppedIndexes = new Set<string>();

  // Strip SQL comments to avoid false matches
  const cleanSql = sqlContent
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // 1. Match ADD CONSTRAINT [IF NOT EXISTS] name ...
  const conRegex = /(?:ADD\s+CONSTRAINT|CONSTRAINT)\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([a-zA-Z0-9_]+)["']?\s+(?:CHECK|UNIQUE|FOREIGN\s+KEY|PRIMARY\s+KEY)/gi;
  let match: RegExpExecArray | null;
  while ((match = conRegex.exec(cleanSql)) !== null) {
    constraints.add(match[1].toLowerCase());
  }

  // 2. Match CREATE [OR REPLACE] TRIGGER name ...
  const trgRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = trgRegex.exec(cleanSql)) !== null) {
    triggers.add(match[1].toLowerCase());
  }

  // 3. Match CREATE [OR REPLACE] FUNCTION [public.]name(...) ...
  const fnRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?\s*\(/gi;
  while ((match = fnRegex.exec(cleanSql)) !== null) {
    functions.add(match[1].toLowerCase());
  }

  // 4. Match CREATE [UNIQUE] INDEX [IF NOT EXISTS] name ON ...
  const idxRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([a-zA-Z0-9_]+)["']?\s+ON/gi;
  while ((match = idxRegex.exec(cleanSql)) !== null) {
    indexes.add(match[1].toLowerCase());
  }

  // 5. Match DROP INDEX [IF EXISTS] [public.]name
  const dropIdxRegex = /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = dropIdxRegex.exec(cleanSql)) !== null) {
    droppedIndexes.add(match[1].toLowerCase());
  }

  return {
    constraints: Array.from(constraints),
    triggers: Array.from(triggers),
    functions: Array.from(functions),
    indexes: Array.from(indexes),
    droppedIndexes: Array.from(droppedIndexes),
  };
}

describe('Item 5: Migration Safety & Live Schema Synchronization', () => {
  let sql: postgres.Sql;
  const allConstraints = new Set<string>();
  const allTriggers = new Set<string>();
  const allFunctions = new Set<string>();
  const allIndexes = new Set<string>();
  let files: string[] = [];

  beforeAll(async () => {
    const dbUrl = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('Missing DATABASE_URL / MIGRATION_DATABASE_URL');
    sql = postgres(dbUrl, {
      max: 1,
      prepare: false,
      ssl: dbUrl.includes('localhost') ? false : 'require',
    });

    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const parsed = parseSqlFile(content);

      parsed.constraints.forEach((c) => allConstraints.add(c));
      parsed.triggers.forEach((t) => allTriggers.add(t));
      parsed.functions.forEach((f) => allFunctions.add(f));
      parsed.indexes.forEach((i) => allIndexes.add(i));
      parsed.droppedIndexes.forEach((i) => allIndexes.delete(i));
    }

    console.log('\n=== MIGRATION SCHEMA AUDIT INVENTORY ===');
    console.log(`Migration files scanned: ${files.join(', ')}`);
    console.log(`Constraints audited (${allConstraints.size}): ${Array.from(allConstraints).join(', ')}`);
    console.log(`Triggers audited (${allTriggers.size}): ${Array.from(allTriggers).join(', ')}`);
    console.log(`Functions audited (${allFunctions.size}): ${Array.from(allFunctions).join(', ')}`);
    console.log(`Indexes audited (${allIndexes.size}): ${Array.from(allIndexes).join(', ')}`);
    console.log('========================================\n');
  });

  afterAll(async () => {
    if (sql) await sql.end({ timeout: 5 });
  });

  it('1. asserts every parsed migration constraint exists in live database', async () => {
    const liveConstraints = await sql`SELECT conname FROM pg_constraint;`;
    const liveConstraintSet = new Set(liveConstraints.map((r) => r.conname.toLowerCase()));

    const missingConstraints: string[] = [];
    for (const c of allConstraints) {
      if (!liveConstraintSet.has(c)) {
        missingConstraints.push(c);
      }
    }
    expect(missingConstraints, `Missing live constraints: ${missingConstraints.join(', ')}`).toEqual([]);
  });

  it('2. asserts every parsed migration trigger exists in live database', async () => {
    const liveTriggers = await sql`SELECT tgname FROM pg_trigger;`;
    const liveTriggerSet = new Set(liveTriggers.map((r) => r.tgname.toLowerCase()));

    const missingTriggers: string[] = [];
    for (const t of allTriggers) {
      if (!liveTriggerSet.has(t)) {
        missingTriggers.push(t);
      }
    }
    expect(missingTriggers, `Missing live triggers: ${missingTriggers.join(', ')}`).toEqual([]);
  });

  it('3. asserts every parsed migration function exists in live database', async () => {
    const liveFunctions = await sql`SELECT proname FROM pg_proc;`;
    const liveFunctionSet = new Set(liveFunctions.map((r) => r.proname.toLowerCase()));

    const missingFunctions: string[] = [];
    for (const f of allFunctions) {
      if (!liveFunctionSet.has(f)) {
        missingFunctions.push(f);
      }
    }
    expect(missingFunctions, `Missing live functions: ${missingFunctions.join(', ')}`).toEqual([]);
  });

  it('4. asserts every parsed migration index exists in live database', async () => {
    // Must fail if zero indexes were parsed from migrations
    expect(allIndexes.size, 'Expected migration files to contain parsed indexes').toBeGreaterThan(0);

    const liveIndexes = await sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`;
    const liveIndexSet = new Set(liveIndexes.map((r) => r.indexname.toLowerCase()));

    const missingIndexes: string[] = [];
    for (const idx of allIndexes) {
      if (!liveIndexSet.has(idx)) {
        missingIndexes.push(idx);
      }
    }
    expect(missingIndexes, `Missing live indexes: ${missingIndexes.join(', ')}`).toEqual([]);
  });

  it('5. verifies app_migrations tracking table exists and records all applied migrations with checksums', async () => {
    const rows = await sql`
      SELECT filename, checksum, applied_at FROM public.app_migrations ORDER BY id ASC;
    `;
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const recordedFiles = rows.map((r) => r.filename);
    expect(recordedFiles).toContain('0001_core_schema.sql');
    expect(recordedFiles).toContain('0002_rls_policies_only.sql');
    expect(recordedFiles).toContain('0004_db_constraints.sql');
    expect(recordedFiles).toContain('0005_version_and_caps.sql');
    expect(recordedFiles).toContain('0006_missing_caps.sql');
    expect(recordedFiles).toContain('0007_indexes.sql');
    expect(recordedFiles).toContain('0008_drop_duplicate_indexes.sql');

    for (const row of rows) {
      expect(row.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(row.applied_at).toBeTruthy();
    }
  });
});
