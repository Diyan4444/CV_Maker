import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { updateSession } from '../lib/supabase/middleware';
import { getBackgroundGroupLabel, BACKGROUND_GROUPS } from '../config/onboarding/departments';

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe('Phase 8H Review Fixes: Security & Label Helpers', () => {
  it('every route calling getVerifiedUser() is covered by AUTH_ROUTES in middleware.ts and proxy.ts matcher', () => {
    const srcRoot = path.resolve(process.cwd(), 'src');
    const middlewareSrc = fs.readFileSync(path.join(srcRoot, 'lib/supabase/middleware.ts'), 'utf8');
    const proxySrc = fs.readFileSync(path.join(srcRoot, 'proxy.ts'), 'utf8');

    const authMatch = middlewareSrc.match(/const AUTH_ROUTES\s*=\s*\[([^\]]+)\]/);
    expect(authMatch).not.toBeNull();
    const authRoutes = authMatch![1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);

    // proxy.ts matcher should be the catch-all negative lookahead excluding static assets only
    expect(proxySrc).toContain('/((?!_next/static|_next/image|favicon.ico');

    const appDir = path.join(srcRoot, 'app');
    const allAppFiles = walkDir(appDir);
    const callers = allAppFiles.filter((file) => {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes('getVerifiedUser');
    });

    expect(callers.length).toBeGreaterThan(0);

    for (const file of callers) {
      const rel = path.relative(appDir, file).replace(/\\/g, '/');
      // Strip Next.js route groups like (dashboard)/ and trailing /page.tsx or /route.ts
      const cleaned = rel
        .replace(/\([^)]+\)\//g, '')
        .replace(/\/(page|route)\.(ts|tsx)$/, '');
      const routePath = '/' + cleaned;
      const isCovered = authRoutes.some((prefix) => routePath.startsWith(prefix));
      expect(isCovered, `${rel} (${routePath}) calls getVerifiedUser() but is not covered by AUTH_ROUTES`).toBe(true);
    }
  });

  it('updateSession strips incoming forged x-verified-user-* headers on matched routes', async () => {
    const forgedHeaders = new Headers({
      'x-verified-user-id': '00000000-0000-0000-0000-000000000099',
      'x-verified-user-email': 'forged@evil.local',
      'x-verified-user-email-confirmed': '1',
      'x-verified-user-created-at': '2020-01-01T00:00:00Z',
      'x-verified-user-providers': 'google',
    });

    const req = new NextRequest('http://localhost:3101/privacy', { headers: forgedHeaders });
    const res = await updateSession(req);

    // NextResponse.next({ request: { headers } }) stores overridden request headers in x-middleware-override-headers
    expect(res.headers.get('x-middleware-request-x-verified-user-id')).toBeNull();
    expect(res.headers.get('x-middleware-request-x-verified-user-email')).toBeNull();
    expect(res.headers.get('x-middleware-request-x-verified-user-email-confirmed')).toBeNull();
    expect(res.headers.get('x-middleware-request-x-verified-user-created-at')).toBeNull();
    expect(res.headers.get('x-middleware-request-x-verified-user-providers')).toBeNull();
  });

  it('getBackgroundGroupLabel maps raw snake_case IDs to friendly labels and dashboard uses it', () => {
    for (const group of BACKGROUND_GROUPS) {
      expect(getBackgroundGroupLabel(group.id)).toBe(group.label);
    }
    expect(getBackgroundGroupLabel('engineering_technology')).toBe('Engineering & Technology');
    expect(getBackgroundGroupLabel('')).toBe('');
    expect(getBackgroundGroupLabel(null)).toBe('');

    const dashboardSrc = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/page.tsx'),
      'utf8'
    );
    expect(dashboardSrc).toContain('getBackgroundGroupLabel(');
  });
});
