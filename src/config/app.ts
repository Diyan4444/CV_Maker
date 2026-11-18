export const PRODUCT_NAME = "FolioOne"; // Configurable single constant placeholder

export const RESERVED_USERNAMES = new Set([
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
]);

export function isValidUsername(username: string): { valid: boolean; error?: string } {
  const sanitized = username.trim().toLowerCase();
  if (sanitized.length < 3) return { valid: false, error: 'Username must be at least 3 characters long.' };
  if (sanitized.length > 30) return { valid: false, error: 'Username cannot exceed 30 characters.' };
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(sanitized)) {
    return { valid: false, error: 'Username can only contain lowercase alphanumeric characters and hyphens, and cannot start or end with a hyphen.' };
  }
  if (RESERVED_USERNAMES.has(sanitized)) {
    return { valid: false, error: `"${sanitized}" is a reserved system path and cannot be chosen.` };
  }
  return { valid: true };
}
