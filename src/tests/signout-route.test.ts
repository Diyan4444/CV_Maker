import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/(auth)/auth/signout/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signOut: vi.fn(async () => ({ error: null })),
    },
  })),
}));

describe('POST /auth/signout route handler', () => {
  it('returns 303 See Other with Location /login by default', async () => {
    const req = new Request('https://quillfolio.example.com/auth/signout', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://quillfolio.example.com/login');
  });

  it('returns 303 See Other and honors safe relative next param', async () => {
    const req = new Request('https://quillfolio.example.com/auth/signout?next=/privacy', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://quillfolio.example.com/privacy');
  });

  it('returns 303 See Other and blocks unsafe external next param', async () => {
    const req = new Request('https://quillfolio.example.com/auth/signout?next=https://evil.com', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://quillfolio.example.com/login');
  });
});
