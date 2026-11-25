import { describe, it, expect } from 'vitest';
import { mapLoginError } from '@/lib/auth/login-error-map';

describe('mapLoginError', () => {
  it('returns null when no error parameters are present', () => {
    expect(mapLoginError({})).toBeNull();
    expect(mapLoginError({ error: null, errorCode: null, errorDescription: null })).toBeNull();
  });

  it('maps otp_expired to a plain expired-link message without raw codes', () => {
    const msg = mapLoginError({ errorCode: 'otp_expired', errorDescription: 'Token has expired' });
    expect(msg).toContain('expired');
    expect(msg).not.toContain('otp_expired');
  });

  it('maps access_denied to a plain cancelled message', () => {
    const msg = mapLoginError({ error: 'access_denied', errorDescription: 'User denied access' });
    expect(msg).toContain('cancelled');
    expect(msg).not.toContain('access_denied');
  });

  it('maps auth_callback_failed to a plain callback failure message', () => {
    const msg = mapLoginError({ error: 'auth_callback_failed' });
    expect(msg).toContain('could not complete sign-in');
    expect(msg).not.toContain('auth_callback_failed');
  });

  it('maps unknown errors to a generic plain message without leaking raw tokens or codes', () => {
    const msg = mapLoginError({ error: 'internal_xyz_token_12345', errorDescription: 'raw stack 999' });
    expect(msg).toBe('Sign-in could not be completed. Please try again.');
  });
});
