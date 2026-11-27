import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import { assertTestProjectRefAllowed } from '../../lib/test-utils/production-guard';
import { db } from '../../lib/db';
import { masterProfiles, education, experiences, projects, skills, documents, documentSections } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3101';

const hasCredentials = Boolean(
  supabaseUrl && anonKey && serviceKey && !supabaseUrl.includes('placeholder')
);

describe.skipIf(!hasCredentials)('Phase 8H Review Fixes: Verified Headers, /api/account/me, layoutSettings & Onboarding Parity', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAId = '';
  let userBId = '';
  let userACookies = '';
  let docAId = '';

  const emailA = `test-8h-a-${Date.now()}@quillfolio.local`;
  const emailB = `test-8h-b-${Date.now()}@quillfolio.local`;
  const password = 'TestSecurePass123!';

  beforeAll(async () => {
    assertTestProjectRefAllowed(supabaseUrl);
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const resA = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: '8H User A' },
    });
    if (resA.error) throw resA.error;
    userAId = resA.data.user.id;

    const resB = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: '8H User B' },
    });
    if (resB.error) throw resB.error;
    userBId = resB.data.user.id;

    await (adminClient as any).from('master_profiles').insert({
      user_id: userAId,
      background_group: 'engineering_technology',
      specialization: 'Computer Science Engineering',
      headline: 'User A Headline',
      summary: 'User A Summary',
    });

    await (adminClient as any).from('master_profiles').insert({
      user_id: userBId,
      background_group: 'arts_humanities',
      specialization: 'History',
      headline: 'User B Secret Headline',
      summary: 'User B Secret Summary',
    });

    const capturedA: Record<string, string> = {};
    const ssrClientA = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll: () => Object.entries(capturedA).map(([name, value]) => ({ name, value })),
        setAll: (toSet) => toSet.forEach((c) => { capturedA[c.name] = c.value; }),
      },
    });
    const { error: signInErr } = await ssrClientA.auth.signInWithPassword({ email: emailA, password });
    if (signInErr) throw signInErr;
    userACookies = Object.entries(capturedA).map(([k, v]) => `${k}=${v}`).join('; ');

    const { data: docData, error: docErr } = await (adminClient as any)
      .from('documents')
      .insert({
        user_id: userAId,
        title: '8H Save Validation Doc',
        type: 'resume',
        template_id: 'ats_single_column',
        accent_color: '#800021',
        status: 'draft',
        version: 1,
      })
      .select('id')
      .single();
    if (docErr) throw docErr;
    docAId = docData.id;
  });

  afterAll(async () => {
    if (adminClient) {
      if (userAId) await adminClient.auth.admin.deleteUser(userAId);
      if (userBId) await adminClient.auth.admin.deleteUser(userBId);
    }
  });

  it('0a(i): forged x-verified-user-* headers with no session redirect protected routes to /login', async () => {
    const forgedHeaders = {
      'x-verified-user-id': userAId,
      'x-verified-user-email': emailA,
      'x-verified-user-email-confirmed': '1',
      'x-verified-user-created-at': new Date().toISOString(),
      'x-verified-user-providers': 'email',
    };

    for (const route of ['/dashboard', '/profile', '/settings', `/editor/${docAId}`, '/onboarding']) {
      const res = await fetch(`${BASE_URL}${route}`, {
        headers: forgedHeaders,
        redirect: 'manual',
      });
      expect(res.status, `Route ${route} should redirect without session`).toBeGreaterThanOrEqual(300);
      expect(res.status).toBeLessThan(400);
      expect(res.headers.get('location') || '').toContain('/login');
    }
  });

  it('0a(ii): logged in as User A with forged x-verified-user-* headers naming User B still serves User A data only', async () => {
    const forgedBHeaders = {
      Cookie: userACookies,
      'x-verified-user-id': userBId,
      'x-verified-user-email': emailB,
      'x-verified-user-email-confirmed': '1',
      'x-verified-user-created-at': new Date().toISOString(),
      'x-verified-user-providers': 'email',
    };

    for (const route of ['/dashboard', '/profile', '/settings']) {
      const res = await fetch(`${BASE_URL}${route}`, {
        headers: forgedBHeaders,
        redirect: 'manual',
      });
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain(emailA);
      expect(html).not.toContain(emailB);
      expect(html).not.toContain('User B Secret Headline');
    }
  });

  it('0b: /api/account/me returns 401 without session and only caller id with session', async () => {
    const unauthRes = await fetch(`${BASE_URL}/api/account/me`);
    expect(unauthRes.status).toBe(401);

    const authRes = await fetch(`${BASE_URL}/api/account/me`, {
      headers: { Cookie: userACookies },
    });
    expect(authRes.status).toBe(200);
    const body = await authRes.json();
    expect(body).toEqual({ id: userAId });
  });

  it('0b: /api/documents/[documentId]/save rejects invalid layoutSettings (below min, above max, wrong type, unknown key) with 400', async () => {
    const invalidCases = [
      { fontSize: 4 }, // below min 8.5
      { fontSize: 24 }, // above max 12
      { fontSize: '10' }, // wrong type
      { unknownSettingKey: true }, // unknown key (.strict())
    ];

    for (const badLayout of invalidCases) {
      const res = await fetch(`${BASE_URL}/api/documents/${docAId}/save`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookies,
        },
        body: JSON.stringify({
          clientVersion: 1,
          meta: {
            layoutSettings: badLayout,
          },
          sections: [],
        }),
      });
      expect(res.status, `Expected 400 for layoutSettings=${JSON.stringify(badLayout)}`).toBe(400);
    }
  });

  it('0b: onboarding wizard API saves the exact expected master_profiles, child tables, and document rows', async () => {
    const res = await fetch(`${BASE_URL}/api/profile/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookies,
      },
      body: JSON.stringify({
        outputType: 'resume',
        backgroundGroup: 'engineering_technology',
        specialization: 'Computer Science Engineering',
        stage: 'final_year',
        purposes: ['full_time_job'],
        formValues: {
          institution: 'MIT',
          degree: 'B.S. Computer Science',
          internships_industrial_training: 'Acme Systems',
          programming_languages: ['TypeScript', 'PostgreSQL'],
          final_year_project_title: 'Distributed KV',
          final_year_project_description: 'Built Raft consensus store.',
          github_profile: 'https://github.com/test8h',
        },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.documentId).toBeTruthy();

    const [profileRow] = await db
      .select()
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, userAId))
      .limit(1);
    expect(profileRow.backgroundGroup).toBe('engineering_technology');
    expect(profileRow.specialization).toBe('Computer Science Engineering');
    expect(profileRow.stage).toBe('final_year');
    expect(profileRow.purposes).toEqual(['full_time_job']);
    expect((profileRow.socialLinks as Record<string, string>)?.github).toBe('https://github.com/test8h');

    const eduRows = await db.select().from(education).where(eq(education.profileId, profileRow.id));
    expect(eduRows.some((e) => e.institution === 'MIT' && e.degree === 'B.S. Computer Science')).toBe(true);

    const expRows = await db.select().from(experiences).where(eq(experiences.profileId, profileRow.id));
    expect(expRows.some((e) => e.organization === 'Acme Systems')).toBe(true);

    const projRows = await db.select().from(projects).where(eq(projects.profileId, profileRow.id));
    expect(projRows.some((p) => p.title === 'Distributed KV')).toBe(true);

    const skillRows = await db.select().from(skills).where(eq(skills.profileId, profileRow.id));
    expect(skillRows.some((s) => (s.items || []).some((i) => i.name === 'TypeScript'))).toBe(true);

    const [docRow] = await db.select().from(documents).where(eq(documents.id, data.documentId)).limit(1);
    expect(docRow.userId).toBe(userAId);
    expect(docRow.type).toBe('resume');

    const secRows = await db.select().from(documentSections).where(eq(documentSections.documentId, data.documentId));
    expect(secRows.length).toBeGreaterThanOrEqual(4);
  });
});
