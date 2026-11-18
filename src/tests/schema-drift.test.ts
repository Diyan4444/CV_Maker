import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

/**
 * Checks if the Drizzle schema and migrations are in sync.
 * Runs `drizzle-kit check` or checks for uncommitted diffs.
 */
describe('Schema Drift Detection', () => {
  it('drizzle schema matches generated migrations without pending diffs', () => {
    const output = execSync('npx drizzle-kit generate', { encoding: 'utf-8' });
    // If there were new changes, drizzle-kit would generate a new file.
    // When in sync, it outputs: "No schema changes detected" or 0 new migrations.
    expect(output.toLowerCase()).toContain('no schema changes');
  });
});
