import { describe, it, expect } from 'vitest';
import { RESERVED_USERNAMES } from '../config/reserved-usernames';
import fs from 'fs';
import path from 'path';

describe('Reserved Usernames Synchronization: DB Trigger vs App Config', () => {
  it('app config RESERVED_USERNAMES exactly matches PostgreSQL trigger check_reserved_username() list', () => {
    const migrationSqlPath = path.resolve(process.cwd(), 'supabase/migrations/0004_db_constraints.sql');
    const sqlContent = fs.readFileSync(migrationSqlPath, 'utf-8');

    // Extract reserved_names array literal from SQL trigger
    const match = sqlContent.match(/reserved_names\s+TEXT\[\]\s*:=\s*ARRAY\[([\s\S]*?)\];/);
    expect(match).toBeDefined();

    const rawArrayContent = match![1];
    const dbReservedNames = rawArrayContent
      .split(',')
      .map((item) => item.trim().replace(/^'|'$/g, '').toLowerCase())
      .filter(Boolean);

    expect([...dbReservedNames].sort()).toEqual([...RESERVED_USERNAMES].sort());
  });
});
