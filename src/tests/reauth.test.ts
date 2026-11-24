import { describe, it, expect } from 'vitest';
import {
  isRecentSignIn,
  parseReauthWindow,
  DEFAULT_REAUTH_WINDOW_SECONDS,
} from '../lib/account/reauth';

describe('Account Re-authentication & Email Confirmation', () => {
  describe('parseReauthWindow', () => {
    it('defaults to 900 seconds when unset or empty', () => {
      expect(parseReauthWindow(undefined)).toBe(DEFAULT_REAUTH_WINDOW_SECONDS);
      expect(parseReauthWindow('')).toBe(DEFAULT_REAUTH_WINDOW_SECONDS);
    });

    it('accepts integer values between 1 and 3600', () => {
      expect(parseReauthWindow('1')).toBe(1);
      expect(parseReauthWindow('900')).toBe(900);
      expect(parseReauthWindow('3600')).toBe(3600);
    });

    it('rejects values outside 1..3600 and non-integers', () => {
      expect(() => parseReauthWindow('0')).toThrow(/Must be an integer between 1 and 3600/);
      expect(() => parseReauthWindow('-1')).toThrow(/Must be an integer between 1 and 3600/);
      expect(() => parseReauthWindow('3601')).toThrow(/Must be an integer between 1 and 3600/);
      expect(() => parseReauthWindow('abc')).toThrow(/Must be an integer between 1 and 3600/);
      expect(() => parseReauthWindow('12.5')).toThrow(/Must be an integer between 1 and 3600/);
    });
  });

  describe('isRecentSignIn', () => {
    it('returns false for null, undefined, or empty timestamps', () => {
      expect(isRecentSignIn(null, Date.now(), 900)).toBe(false);
      expect(isRecentSignIn(undefined, Date.now(), 900)).toBe(false);
      expect(isRecentSignIn('', Date.now(), 900)).toBe(false);
      expect(isRecentSignIn('invalid-date', Date.now(), 900)).toBe(false);
    });

    it('returns true when sign in was within window', () => {
      const now = 1000000;
      const signedInAt = new Date(now - 300 * 1000).toISOString(); // 300s ago
      expect(isRecentSignIn(signedInAt, now, 900)).toBe(true);
    });

    it('returns false when sign in exceeds window', () => {
      const now = 1000000;
      const signedInAt = new Date(now - 901 * 1000).toISOString(); // 901s ago
      expect(isRecentSignIn(signedInAt, now, 900)).toBe(false);
    });

    it('honors 1-second window correctly (used in tests)', () => {
      const now = 2000000;
      const signedInAt = new Date(now - 2000).toISOString(); // 2 seconds ago
      expect(isRecentSignIn(signedInAt, now, 1)).toBe(false);

      const freshSignIn = new Date(now - 500).toISOString(); // 0.5 seconds ago
      expect(isRecentSignIn(freshSignIn, now, 1)).toBe(true);
    });
  });

  describe('Email Confirmation Matching', () => {
    const isEmailMatching = (input: string | null | undefined, actual: string | null | undefined): boolean => {
      if (!input || !actual) return false;
      return input.trim().toLowerCase() === actual.trim().toLowerCase();
    };

    it('matches exact email address', () => {
      expect(isEmailMatching('user@example.com', 'user@example.com')).toBe(true);
    });

    it('matches case-insensitively with leading/trailing whitespace', () => {
      expect(isEmailMatching('  User@Example.COM ', 'user@example.com')).toBe(true);
      expect(isEmailMatching('user@example.com', 'USER@EXAMPLE.COM')).toBe(true);
    });

    it('rejects mismatched or empty emails', () => {
      expect(isEmailMatching('other@example.com', 'user@example.com')).toBe(false);
      expect(isEmailMatching('', 'user@example.com')).toBe(false);
      expect(isEmailMatching(null, 'user@example.com')).toBe(false);
      expect(isEmailMatching(undefined, 'user@example.com')).toBe(false);
    });
  });
});
