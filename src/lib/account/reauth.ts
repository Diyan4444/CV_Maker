/**
 * Account Re-authentication Verification
 *
 * For sensitive actions (such as account deletion), requires recent sign-in
 * within ACCOUNT_REAUTH_WINDOW_SECONDS (default 900 seconds / 15 minutes, range 1..3600).
 */

export const DEFAULT_REAUTH_WINDOW_SECONDS = 900;
export const MIN_REAUTH_WINDOW_SECONDS = 1;
export const MAX_REAUTH_WINDOW_SECONDS = 3600;

export function parseReauthWindow(
  envVal: string | undefined = process.env.ACCOUNT_REAUTH_WINDOW_SECONDS
): number {
  if (envVal === undefined || envVal === '') {
    return DEFAULT_REAUTH_WINDOW_SECONDS;
  }

  const parsed = Number(envVal);
  if (!Number.isInteger(parsed) || parsed < MIN_REAUTH_WINDOW_SECONDS || parsed > MAX_REAUTH_WINDOW_SECONDS) {
    throw new Error(
      `Invalid ACCOUNT_REAUTH_WINDOW_SECONDS: "${envVal}". Must be an integer between ${MIN_REAUTH_WINDOW_SECONDS} and ${MAX_REAUTH_WINDOW_SECONDS}.`
    );
  }

  return parsed;
}

/**
 * Pure function to check if the user's last sign-in timestamp falls within the allowed window.
 *
 * @param lastSignInAt ISO 8601 string or timestamp of user's last sign in
 * @param now Current timestamp as milliseconds or Date (defaults to Date.now())
 * @param windowSeconds Window length in seconds (defaults to parsed environment config)
 */
export function isRecentSignIn(
  lastSignInAt: string | null | undefined,
  now: number | Date = Date.now(),
  windowSeconds?: number
): boolean {
  if (!lastSignInAt) {
    return false;
  }

  const windowSec = windowSeconds !== undefined ? windowSeconds : parseReauthWindow();
  const lastSignInMs = new Date(lastSignInAt).getTime();

  if (isNaN(lastSignInMs)) {
    return false;
  }

  const nowMs = typeof now === 'number' ? now : now.getTime();
  const diffSeconds = (nowMs - lastSignInMs) / 1000;

  // Allow 5s negative clock skew, and require diff <= windowSec
  return diffSeconds >= -5 && diffSeconds <= windowSec;
}
