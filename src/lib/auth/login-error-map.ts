export function mapLoginError(params: {
  error?: string | null;
  errorCode?: string | null;
  errorDescription?: string | null;
}): string | null {
  const err = (params.error || '').toLowerCase();
  const code = (params.errorCode || '').toLowerCase();
  const desc = (params.errorDescription || '').toLowerCase();

  if (!err && !code && !desc) return null;

  if (
    code === 'otp_expired' ||
    err === 'otp_expired' ||
    desc.includes('expired') ||
    desc.includes('invalid or has expired')
  ) {
    return 'That sign-in link has expired or has already been used. Please request a new magic link.';
  }

  if (err === 'access_denied' || desc.includes('access_denied') || desc.includes('cancelled')) {
    return 'Sign-in was cancelled. You can try again with Google or an email magic link.';
  }

  if (err === 'auth_callback_failed') {
    return 'We could not complete sign-in. Please request a new link or try Google sign-in again.';
  }

  if (desc.includes('rate limit') || code === 'over_email_send_rate_limit') {
    return 'Too many sign-in attempts. Please wait a minute before trying again.';
  }

  return 'Sign-in could not be completed. Please try again.';
}
