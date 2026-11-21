/**
 * Environment Configuration & Startup Verification
 * Strictly enforces that all required server-side secrets and environment
 * variables are configured before server execution starts.
 */

export interface EnvAuditEntry {
  name: string;
  scope: 'client' | 'server' | 'cli';
  required: boolean;
  description: string;
}

export const ENV_AUDIT_INVENTORY: EnvAuditEntry[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    scope: 'client',
    required: true,
    description: 'Supabase Project API URL used by SSR, API routes, middleware, and browser client',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    scope: 'client',
    required: true,
    description: 'Supabase anonymous public API key for browser client authentication',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    scope: 'server',
    required: true,
    description: 'Supabase Service Role administrative key with full DB access (bypasses RLS)',
  },
  {
    name: 'DATABASE_URL',
    scope: 'server',
    required: true,
    description: 'PostgreSQL connection string using Supabase Transaction Pooler (port 6543)',
  },
  {
    name: 'MIGRATION_DATABASE_URL',
    scope: 'cli',
    required: false,
    description: 'PostgreSQL direct/session connection string (port 5432) for npm run db:apply',
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    scope: 'client',
    required: false,
    description: 'Canonical application origin URL for auth callback redirects (defaults to origin)',
  },
  {
    name: 'PRIMARY_ADMIN_EMAIL',
    scope: 'cli',
    required: false,
    description: 'Email address of primary developer account excluded from test user deletions',
  },
  {
    name: 'NODE_ENV',
    scope: 'server',
    required: true,
    description: 'Node environment flag ("production", "development", or "test")',
  },
];

export function validateServerEnv(): void {
  // Only execute on server side
  if (typeof window !== 'undefined') return;

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
  ] as const;

  const missing = requiredVars.filter(
    (varName) => !process.env[varName] || process.env[varName]!.trim() === ''
  );

  if (missing.length > 0) {
    const banner =
      `\n=======================================================\n` +
      `[Quillfolio] FATAL: Missing Required Server Environment Variables\n` +
      `The following mandatory environment variable(s) are undefined:\n` +
      missing.map((v) => `  - ${v}`).join('\n') +
      `\n\nPlease supply these variables in your deployment settings\n` +
      `or local .env.local file before booting the server.\n` +
      `=======================================================\n`;
    console.error(banner);
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}`);
  }
}
