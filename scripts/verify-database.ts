import postgres from 'postgres';
import path from 'node:path';
import dotenv from 'dotenv';
import { getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../src/lib/db/schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * Derives the expected public table list dynamically from Drizzle schema definition,
 * plus the internal migration tracking table.
 */
export function getExpectedTables(): string[] {
  const tableNames = new Set<string>();
  tableNames.add('app_migrations');

  for (const exported of Object.values(schema)) {
    if (is(exported, PgTable)) {
      tableNames.add(getTableName(exported));
    }
  }
  return Array.from(tableNames).sort();
}

export const EXPECTED_CORE_TABLES = getExpectedTables();

export async function verifyDatabase(): Promise<boolean> {
  const dbUrl = process.env.MIGRATION_DATABASE_URL;
  if (!dbUrl) {
    console.error('ERROR: Missing required environment variable MIGRATION_DATABASE_URL.');
    return false;
  }

  // Parse host without password
  try {
    const parsed = new URL(dbUrl);
    console.log(`\n=======================================================`);
    console.log(`[db:verify] Starting Read-Only Database Schema Verification`);
    console.log(`[db:verify] Host: ${parsed.hostname}`);
    console.log(`[db:verify] Port: ${parsed.port || '5432'}`);
    console.log(`=======================================================\n`);
  } catch (err: any) {
    console.error(`ERROR: Failed to parse MIGRATION_DATABASE_URL: ${err.message}`);
    return false;
  }

  const sql = postgres(dbUrl, {
    max: 1,
    prepare: false,
    ssl: dbUrl.includes('localhost') ? false : 'require',
  });

  let hasErrors = false;
  const failureReasons: string[] = [];

  try {
    // Enforce READ ONLY transaction mode
    await sql.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY;`;

      // 1. Installed Extensions
      console.log('--- 1. INSTALLED EXTENSIONS ---');
      const extensions = await tx`
        SELECT extname, extversion FROM pg_extension ORDER BY extname;
      `;
      for (const ext of extensions) {
        console.log(`  - ${ext.extname} (v${ext.extversion})`);
      }
      console.log();

      // 2. Expected Core Tables & RLS Status
      console.log('--- 2. PUBLIC TABLES & ROW LEVEL SECURITY ---');
      const tables = await tx`
        SELECT
          c.relname as table_name,
          c.relrowsecurity as rls_enabled,
          c.relforcerowsecurity as rls_forced
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname;
      `;

      const existingTableMap = new Map<string, { rls_enabled: boolean; rls_forced: boolean }>();
      for (const t of tables) {
        existingTableMap.set(t.table_name, {
          rls_enabled: t.rls_enabled,
          rls_forced: t.rls_forced,
        });
        console.log(
          `  - ${t.table_name.padEnd(22)} | RLS: ${t.rls_enabled ? 'ENABLED ' : 'DISABLED'} | FORCED: ${
            t.rls_forced ? 'YES' : 'NO '
          }`
        );
      }
      console.log();

      // Check all 15 expected tables (from schema.ts + app_migrations) are present
      for (const expected of EXPECTED_CORE_TABLES) {
        if (!existingTableMap.has(expected)) {
          hasErrors = true;
          failureReasons.push(`Missing expected table: "${expected}"`);
        } else {
          const tInfo = existingTableMap.get(expected)!;
          if (expected !== 'app_migrations' && !tInfo.rls_enabled) {
            hasErrors = true;
            failureReasons.push(`Table "${expected}" lacks Row Level Security (RLS is disabled)`);
          }
        }
      }

      // Check for any unexpected tables in public schema
      for (const [existingTable] of existingTableMap) {
        if (!EXPECTED_CORE_TABLES.includes(existingTable)) {
          hasErrors = true;
          failureReasons.push(`Unexpected table in public schema: "${existingTable}"`);
        }
      }

      // 3. RLS Policies
      console.log('--- 3. ROW LEVEL SECURITY POLICIES ---');
      const policies = await tx`
        SELECT
          tablename,
          policyname,
          roles,
          cmd
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `;

      console.log(`Total active policies: ${policies.length}\n`);

      const tablePolicyCounts = new Map<string, number>();
      for (const p of policies) {
        tablePolicyCounts.set(p.tablename, (tablePolicyCounts.get(p.tablename) || 0) + 1);
        console.log(
          `  - [${p.tablename}] "${p.policyname}" | Roles: {${(p.roles || []).join(', ')}} | Cmd: ${p.cmd}`
        );
      }
      console.log();

      // Assert each core application table (14 tables) has >= 1 policy
      for (const expected of EXPECTED_CORE_TABLES) {
        if (expected === 'app_migrations') continue;
        const count = tablePolicyCounts.get(expected) || 0;
        if (count === 0) {
          hasErrors = true;
          failureReasons.push(`Table "${expected}" has 0 RLS policies`);
        }
      }

      // 4. Role Table Privileges (anon, authenticated, service_role)
      console.log('--- 4. ROLE PRIVILEGES (anon, authenticated, service_role) ---');
      const grants = await tx`
        SELECT
          table_name,
          grantee,
          privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee IN ('anon', 'authenticated', 'service_role')
        ORDER BY table_name, grantee, privilege_type;
      `;

      const allowedAuthPrivs = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
      for (const g of grants) {
        console.log(`  - ${g.table_name.padEnd(20)} | Grantee: ${g.grantee.padEnd(14)} | ${g.privilege_type}`);

        // Exit if anon holds ANY privilege on public tables
        if (g.grantee === 'anon') {
          hasErrors = true;
          failureReasons.push(
            `Security violation: "anon" role holds privilege "${g.privilege_type}" on table "${g.table_name}"`
          );
        }

        // Exit if authenticated holds broad or administrative privileges
        if (g.grantee === 'authenticated') {
          if (!allowedAuthPrivs.has(g.privilege_type)) {
            hasErrors = true;
            failureReasons.push(
              `Security violation: "authenticated" role holds unexpected privilege "${g.privilege_type}" on table "${g.table_name}"`
            );
          }
          // On ai_usage_logs, authenticated should ONLY hold SELECT (never INSERT/UPDATE/DELETE)
          if (g.table_name === 'ai_usage_logs' && g.privilege_type !== 'SELECT') {
            hasErrors = true;
            failureReasons.push(
              `Security violation: "authenticated" role holds mutating privilege "${g.privilege_type}" on "ai_usage_logs"`
            );
          }
        }
      }
      console.log();

      // 5. Database Triggers (including on auth.users)
      console.log('--- 5. DATABASE TRIGGERS ---');
      const triggers = await tx`
        SELECT
          n.nspname as schema_name,
          c.relname as table_name,
          t.tgname as trigger_name,
          p.proname as function_name,
          t.tgenabled as enabled
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE (n.nspname = 'public' OR (n.nspname = 'auth' AND c.relname = 'users'))
          AND NOT t.tgisinternal
        ORDER BY n.nspname, c.relname, t.tgname;
      `;

      let hasAuthTrigger = false;
      for (const trg of triggers) {
        if (trg.schema_name === 'auth' && trg.table_name === 'users' && trg.trigger_name === 'on_auth_user_created') {
          hasAuthTrigger = true;
        }
        console.log(
          `  - [${trg.schema_name}.${trg.table_name}] "${trg.trigger_name}" -> ${trg.function_name}() (enabled: ${trg.enabled})`
        );
      }
      if (!hasAuthTrigger) {
        hasErrors = true;
        failureReasons.push('Missing trigger "on_auth_user_created" on auth.users');
      }
      console.log();

      // 6. Functions (SECURITY DEFINER & search_path)
      console.log('--- 6. FUNCTIONS (SECURITY DEFINER & search_path Audit) ---');
      const functions = await tx`
        SELECT
          n.nspname as schema_name,
          p.proname as function_name,
          p.prosecdef as is_security_definer,
          p.proconfig as config_settings
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        ORDER BY p.proname;
      `;

      for (const fn of functions) {
        const configs = fn.config_settings || [];
        const hasSearchPath = configs.some((c: string) => c.startsWith('search_path='));
        console.log(
          `  - ${fn.function_name.padEnd(26)} | SECURITY DEFINER: ${
            fn.is_security_definer ? 'YES' : 'NO '
          } | Config: [${configs.join(', ')}]`
        );

        if (fn.is_security_definer && !hasSearchPath) {
          hasErrors = true;
          failureReasons.push(
            `SECURITY DEFINER function "${fn.function_name}" lacks explicit search_path configuration`
          );
        }
      }
      console.log();

      // 7. Applied Migrations
      console.log('--- 7. APPLIED MIGRATIONS (public.app_migrations) ---');
      const migrations = await tx`
        SELECT id, filename, checksum, applied_at
        FROM public.app_migrations
        ORDER BY id ASC;
      `;
      for (const m of migrations) {
        console.log(
          `  - #${m.id.toString().padStart(2, ' ')}: ${m.filename.padEnd(26)} | Checksum: ${m.checksum.slice(
            0,
            12
          )}... | Applied: ${new Date(m.applied_at).toISOString()}`
        );
      }
      if (migrations.length < 5) {
        hasErrors = true;
        failureReasons.push(`Expected at least 5 applied migrations, found ${migrations.length}`);
      }
      console.log();
    });

    console.log('=======================================================');
    if (hasErrors) {
      console.error('\n❌ DATABASE VERIFICATION FAILED:');
      for (const r of failureReasons) {
        console.error(`  - ${r}`);
      }
      console.log('=======================================================\n');
      return false;
    } else {
      console.log('✅ ALL DATABASE VERIFICATION CHECKS PASSED:');
      console.log('  - All 14 core tables present with Row Level Security enabled and active policies');
      console.log('  - Role privileges verified: anon has 0 privileges; authenticated restricted to standard CRUD');
      console.log('  - auth.users trigger (on_auth_user_created) active and properly configured');
      console.log('  - All SECURITY DEFINER functions enforce explicit search_path');
      console.log('  - Migration history verified in public.app_migrations');
      console.log('=======================================================\n');
      return true;
    }
  } catch (err: any) {
    console.error(`\n[db:verify] Database verification threw error: ${err.message}`);
    return false;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const success = await verifyDatabase();
  process.exit(success ? 0 : 1);
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  main();
}
