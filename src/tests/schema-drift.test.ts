import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

/**
 * Verifies that the in-code Drizzle schema and the generated migrations in drizzle/migrations
 * are in complete synchronization with zero drift.
 */
describe('Schema Drift Detection', () => {
  it('drizzle-kit check verifies migration journal consistency', () => {
    const checkOutput = execSync('npx drizzle-kit check', { encoding: 'utf-8' });
    expect(checkOutput).toContain("Everything's fine");
  });

  it('drizzle schema matches generated migrations without pending diffs', () => {
    const output = execSync('npx drizzle-kit generate', { encoding: 'utf-8' });
    expect(output.toLowerCase()).toContain('no schema changes');
  });
});
