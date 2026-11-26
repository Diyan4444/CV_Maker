import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface ParsedDatabaseObjects {
  constraintsByTable: Array<{ table: string; name: string }>;
  droppedConstraints: string[];
  triggers: Array<{ table: string; name: string }>;
  droppedTriggers: string[];
  functions: string[];
  droppedFunctions: string[];
  indexes: Array<{ table: string; name: string }>;
  droppedIndexes: string[];
  droppedTables: string[];
}

function parseSqlFile(sqlContent: string): ParsedDatabaseObjects {
  const constraintsByTable: Array<{ table: string; name: string }> = [];
  const droppedConstraints = new Set<string>();
  const triggers: Array<{ table: string; name: string }> = [];
  const droppedTriggers = new Set<string>();
  const functions = new Set<string>();
  const droppedFunctions = new Set<string>();
  const indexes: Array<{ table: string; name: string }> = [];
  const droppedIndexes = new Set<string>();
  const droppedTables = new Set<string>();

  const cleanSql = sqlContent
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // Track ALTER TABLE <table> ... ADD CONSTRAINT <name>
  const alterConRegex = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["']?([a-zA-Z0-9_]+)["']?\s+ADD\s+CONSTRAINT\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([a-zA-Z0-9_]+)["']?\s+(?:CHECK|UNIQUE|FOREIGN\s+KEY|PRIMARY\s+KEY)/gi;
  let match: RegExpExecArray | null;
  while ((match = alterConRegex.exec(cleanSql)) !== null) {
    constraintsByTable.push({
      table: match[1].toLowerCase(),
      name: match[2].toLowerCase(),
    });
  }

  // Track inline CREATE TABLE <table> (... CONSTRAINT <name> ...)
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?([a-zA-Z0-9_]+)["']?\s*\(([\s\S]*?)\);/gi;
  while ((match = createTableRegex.exec(cleanSql)) !== null) {
    const tbl = match[1].toLowerCase();
    const body = match[2];
    const inlineConRegex = /CONSTRAINT\s+["']?([a-zA-Z0-9_]+)["']?\s+(?:CHECK|UNIQUE|FOREIGN\s+KEY|PRIMARY\s+KEY)/gi;
    let cMatch: RegExpExecArray | null;
    while ((cMatch = inlineConRegex.exec(body)) !== null) {
      constraintsByTable.push({ table: tbl, name: cMatch[1].toLowerCase() });
    }
  }

  // Track DROP CONSTRAINT [IF EXISTS] <name>
  const dropConRegex = /DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = dropConRegex.exec(cleanSql)) !== null) {
    droppedConstraints.add(match[1].toLowerCase());
  }

  // Track CREATE [OR REPLACE] TRIGGER <name> ... ON [public.]<table>
  const trgRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+["']?([a-zA-Z0-9_]+)["']?[\s\S]*?\bON\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = trgRegex.exec(cleanSql)) !== null) {
    triggers.push({ name: match[1].toLowerCase(), table: match[2].toLowerCase() });
  }

  // Track DROP TRIGGER [IF EXISTS] <name>
  const dropTrgRegex = /DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = dropTrgRegex.exec(cleanSql)) !== null) {
    droppedTriggers.add(match[1].toLowerCase());
  }

  // Track CREATE [OR REPLACE] FUNCTION [public.]<name>(...)
  const fnRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?\s*\(/gi;
  while ((match = fnRegex.exec(cleanSql)) !== null) {
    functions.add(match[1].toLowerCase());
  }

  // Track DROP FUNCTION [IF EXISTS] [public.]<name>
  const dropFnRegex = /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = dropFnRegex.exec(cleanSql)) !== null) {
    droppedFunctions.add(match[1].toLowerCase());
  }

  // Track CREATE [UNIQUE] INDEX [IF NOT EXISTS] <name> ON [public.]<table>
  const idxRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([a-zA-Z0-9_]+)["']?\s+ON\s+(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = idxRegex.exec(cleanSql)) !== null) {
    indexes.push({ name: match[1].toLowerCase(), table: match[2].toLowerCase() });
  }

  // Track DROP INDEX [IF EXISTS] [public.]<name>
  const dropIdxRegex = /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = dropIdxRegex.exec(cleanSql)) !== null) {
    droppedIndexes.add(match[1].toLowerCase());
  }

  // Track DROP TABLE [IF EXISTS] [public.]<table>
  const dropTblRegex = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?["']?([a-zA-Z0-9_]+)["']?/gi;
  while ((match = dropTblRegex.exec(cleanSql)) !== null) {
    droppedTables.add(match[1].toLowerCase());
  }

  return {
    constraintsByTable,
    droppedConstraints: Array.from(droppedConstraints),
    triggers,
    droppedTriggers: Array.from(droppedTriggers),
    functions: Array.from(functions),
    droppedFunctions: Array.from(droppedFunctions),
    indexes,
    droppedIndexes: Array.from(droppedIndexes),
    droppedTables: Array.from(droppedTables),
  };
}

describe('Item 5: Migration Safety & Live Schema Synchronization (Net State)', () => {
  let sql: postgres.Sql;
  const netConstraints = new Map<string, string>(); // name -> table
  const netTriggers = new Map<string, string>(); // name -> table
  const netFunctions = new Set<string>();
  const netIndexes = new Map<string, string>(); // name -> table
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

      // Apply drops first (in case same file recreates) or apply in statement order:
      // Note: within a migration, DROP IF EXISTS followed by ADD/CREATE is common,
      // while 0010 only drops. Applying creations then table/object drops from 0010+ handles both cleanly:
      for (const c of parsed.constraintsByTable) {
        netConstraints.set(c.name, c.table);
      }
      for (const c of parsed.droppedConstraints) {
        // Only remove if not re-added in same file
        if (!parsed.constraintsByTable.some((x) => x.name === c)) {
          netConstraints.delete(c);
        }
      }

      for (const t of parsed.triggers) {
        netTriggers.set(t.name, t.table);
      }
      for (const t of parsed.droppedTriggers) {
        if (!parsed.triggers.some((x) => x.name === t)) {
          netTriggers.delete(t);
        }
      }

      for (const f of parsed.functions) {
        netFunctions.add(f);
      }
      for (const f of parsed.droppedFunctions) {
        if (!parsed.functions.includes(f)) {
          netFunctions.delete(f);
        }
      }

      for (const i of parsed.indexes) {
        netIndexes.set(i.name, i.table);
      }
      for (const i of parsed.droppedIndexes) {
        if (!parsed.indexes.some((x) => x.name === i)) {
          netIndexes.delete(i);
        }
      }

      // Dropping a table cascades its constraints, triggers, and indexes
      for (const tbl of parsed.droppedTables) {
        for (const [cName, cTbl] of netConstraints.entries()) {
          if (cTbl === tbl) netConstraints.delete(cName);
        }
        for (const [tName, tTbl] of netTriggers.entries()) {
          if (tTbl === tbl) netTriggers.delete(tName);
        }
        for (const [iName, iTbl] of netIndexes.entries()) {
          if (iTbl === tbl) netIndexes.delete(iName);
        }
      }
    }

    console.log('\n=== MIGRATION SCHEMA AUDIT INVENTORY (NET STATE) ===');
    console.log(`Migration files scanned: ${files.join(', ')}`);
    console.log(`Net Constraints (${netConstraints.size}): ${Array.from(netConstraints.keys()).join(', ')}`);
    console.log(`Net Triggers (${netTriggers.size}): ${Array.from(netTriggers.keys()).join(', ')}`);
    console.log(`Net Functions (${netFunctions.size}): ${Array.from(netFunctions).join(', ')}`);
    console.log(`Net Indexes (${netIndexes.size}): ${Array.from(netIndexes.keys()).join(', ')}`);
    console.log('====================================================\n');
  });

  afterAll(async () => {
    if (sql) await sql.end({ timeout: 5 });
  });

  it('1. asserts every net migration constraint exists in live database', async () => {
    const liveConstraints = await sql`SELECT conname FROM pg_constraint;`;
    const liveConstraintSet = new Set(liveConstraints.map((r) => r.conname.toLowerCase()));

    const missingConstraints: string[] = [];
    for (const c of netConstraints.keys()) {
      if (!liveConstraintSet.has(c)) {
        missingConstraints.push(c);
      }
    }
    expect(missingConstraints, `Missing live constraints: ${missingConstraints.join(', ')}`).toEqual([]);
  });

  it('2. asserts every net migration trigger exists in live database', async () => {
    const liveTriggers = await sql`SELECT tgname FROM pg_trigger;`;
    const liveTriggerSet = new Set(liveTriggers.map((r) => r.tgname.toLowerCase()));

    const missingTriggers: string[] = [];
    for (const t of netTriggers.keys()) {
      if (!liveTriggerSet.has(t)) {
        missingTriggers.push(t);
      }
    }
    expect(missingTriggers, `Missing live triggers: ${missingTriggers.join(', ')}`).toEqual([]);
  });

  it('3. asserts every net migration function exists in live database', async () => {
    const liveFunctions = await sql`SELECT proname FROM pg_proc;`;
    const liveFunctionSet = new Set(liveFunctions.map((r) => r.proname.toLowerCase()));

    const missingFunctions: string[] = [];
    for (const f of netFunctions) {
      if (!liveFunctionSet.has(f)) {
        missingFunctions.push(f);
      }
    }
    expect(missingFunctions, `Missing live functions: ${missingFunctions.join(', ')}`).toEqual([]);
  });

  it('4. asserts every net migration index exists in live database', async () => {
    expect(netIndexes.size, 'Expected migration files to contain parsed indexes').toBeGreaterThan(0);

    const liveIndexes = await sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public';`;
    const liveIndexSet = new Set(liveIndexes.map((r) => r.indexname.toLowerCase()));

    const missingIndexes: string[] = [];
    for (const idx of netIndexes.keys()) {
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
    expect(rows.length).toBeGreaterThanOrEqual(8);
    const recordedFiles = rows.map((r) => r.filename);
    for (const f of files) {
      expect(recordedFiles).toContain(f);
    }

    for (const row of rows) {
      expect(row.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(row.applied_at).toBeTruthy();
    }
  });
});
