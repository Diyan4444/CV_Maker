import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { validateServerEnv } from '@/lib/env';

validateServerEnv();

const connectionString = process.env.DATABASE_URL || '';

/**
 * Serverless Database Client Configuration
 * Aligned with official Supabase & Postgres.js Serverless recommendations:
 * Reference: https://supabase.com/docs/guides/database/connecting-to-postgres#serverless-environments
 * Reference: https://supabase.com/docs/guides/database/connecting-to-postgres#connecting-with-postgresjs
 *
 * 1. `prepare: false`: Mandatory for Supabase Transaction Pooler (Supavisor on port 6543)
 *    because prepared statements are session-scoped and unsupported in transaction mode.
 * 2. `max: 1`: In serverless/lambda environments (such as Vercel Edge/Serverless functions),
 *    each container handles one request at a time. A small per-instance pool (max: 1)
 *    prevents pooler starvation across concurrent lambdas.
 * 3. Migrations / DDL: Must use direct or session connection via `MIGRATION_DATABASE_URL` (port 5432)
 *    because DDL and transactional locks are not supported over transaction poolers.
 */
const client = postgres(connectionString, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
