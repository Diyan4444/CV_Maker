import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Non-destructive schema drift check.
 * Generates cumulative in-code schema SQL using `drizzle-kit export --dialect=postgresql`
 * and compares it against all generated migration files concatenated in order.
 */
describe('Schema Drift Detection', () => {
  it('drizzle schema matches cumulative generated migration files with zero drift', () => {
    // 1. Export current in-code schema definition
    const currentSchemaSql = execSync('npx drizzle-kit export', { encoding: 'utf-8' }).trim();

    // 2. Read and concatenate all migration files in drizzle/migrations in alphabetical/journal order
    const migrationsDir = path.resolve(process.cwd(), 'drizzle/migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    const cumulativeMigrationSql = migrationFiles
      .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf-8'))
      .join('\n');

    // Compare normalized SQL statements (strip Drizzle statement breakpoints)
    const normalize = (str: string) =>
      str
        .replace(/--> statement-breakpoint/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    expect(normalize(currentSchemaSql)).toBe(normalize(cumulativeMigrationSql));
  });
});
