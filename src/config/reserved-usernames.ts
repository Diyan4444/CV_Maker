/**
 * Reserved usernames that cannot be registered by users.
 * Kept strictly in sync with supabase/migrations/0004_db_constraints.sql
 */
export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'blog',
  'callback',
  'dashboard',
  'docs',
  'edit',
  'editor',
  'export',
  'help',
  'login',
  'logout',
  'me',
  'new',
  'onboarding',
  'privacy',
  'profile',
  'register',
  'resume',
  'root',
  'settings',
  'signin',
  'signout',
  'signup',
  'status',
  'support',
  'terms',
  'u',
  'user',
  'users',
  'website',
] as const;

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase() as typeof RESERVED_USERNAMES[number]);
}
