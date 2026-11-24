import { describe, it, expect } from 'vitest';
import { safeNextPath } from '../lib/navigation/safe-redirect';

describe('safeNextPath', () => {
  it('returns default fallback /dashboard for null, undefined, and empty string', () => {
    expect(safeNextPath(null)).toBe('/dashboard');
    expect(safeNextPath(undefined)).toBe('/dashboard');
    expect(safeNextPath('')).toBe('/dashboard');
    expect(safeNextPath('   ')).toBe('/dashboard');
  });

  it('allows safe relative paths', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/settings')).toBe('/settings');
    expect(safeNextPath('/profile')).toBe('/profile');
    expect(safeNextPath('/editor/doc-123')).toBe('/editor/doc-123');
    expect(safeNextPath('/login?next=%2Fsettings')).toBe('/login?next=%2Fsettings');
    expect(safeNextPath('/settings#danger-zone')).toBe('/settings#danger-zone');
  });

  it('honors custom fallback when provided', () => {
    expect(safeNextPath('https://evil.com', '/custom-fallback')).toBe('/custom-fallback');
    expect(safeNextPath(null, '/login')).toBe('/login');
  });

  it('rejects protocol-relative URLs (//evil.com)', () => {
    expect(safeNextPath('//evil.com')).toBe('/dashboard');
    expect(safeNextPath('///evil.com')).toBe('/dashboard');
  });

  it('rejects absolute URLs with http/https schemes (https://evil.com)', () => {
    expect(safeNextPath('https://evil.com')).toBe('/dashboard');
    expect(safeNextPath('http://evil.com/path')).toBe('/dashboard');
  });

  it('rejects backslash evasion (/\evil.com, /\\evil.com)', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/dashboard');
    expect(safeNextPath('/path\\something')).toBe('/dashboard');
  });

  it('rejects javascript: schemes (javascript:alert(1))', () => {
    expect(safeNextPath('javascript:alert(1)')).toBe('/dashboard');
    expect(safeNextPath('/javascript:alert(1)')).toBe('/dashboard');
  });

  it('rejects URL-encoded bypasses (%2F%2Fevil.com, /%5Cevil.com)', () => {
    expect(safeNextPath('%2F%2Fevil.com')).toBe('/dashboard');
    expect(safeNextPath('/%5Cevil.com')).toBe('/dashboard');
    expect(safeNextPath('/%5cevil.com')).toBe('/dashboard');
    expect(safeNextPath('/%2Fevil.com')).toBe('/dashboard');
    expect(safeNextPath('%252F%252Fevil.com')).toBe('/dashboard');
  });

  it('rejects inputs with ASCII control characters and hostile whitespace', () => {
    expect(safeNextPath('/dashboard\0evil')).toBe('/dashboard');
    expect(safeNextPath('/dashboard\r\nSet-Cookie:bad')).toBe('/dashboard');
    expect(safeNextPath('/dashboard\x1F')).toBe('/dashboard');
    expect(safeNextPath('\x08/dashboard')).toBe('/dashboard');
  });
});
