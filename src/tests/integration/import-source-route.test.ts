import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { assertTestProjectRefAllowed } from '../../lib/test-utils/production-guard';
import { db } from '../../lib/db';
import { documents, masterProfiles, education } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3101';

const hasCredentials = Boolean(
  supabaseUrl && anonKey && serviceKey && !supabaseUrl.includes('placeholder')
);

describe.skipIf(!hasCredentials)('GET /api/documents/[documentId]/import-source', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAId = '';
  let userBId = '';
  let userACookies = '';
  let userBCookies = '';
  let docAId = '';

  beforeAll(async () => {
    assertTestProjectRefAllowed(supabaseUrl!);
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const emailA = `import-a-${Date.now()}@quillfolio.local`;
    const emailB = `import-b-${Date.now()}@quillfolio.local`;
    const pass = 'TestSecurePass123!';

    const { data: uA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: 'Import Test User A' },
    });
    if (errA) throw errA;
    userAId = uA.user.id;

    const { data: uB, error: errB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: pass,
      email_confirm: true,
      user_metadata: { full_name: 'Import Test User B' },
    });
    if (errB) throw errB;
    userBId = uB.user.id;

    // Seed master profile for User A with education but NO experience
    const profileId = randomUUID();
    await db.insert(masterProfiles).values({
      id: profileId,
      userId: userAId,
      headline: 'Systems Researcher',
      summary: 'Researching distributed consensus.',
    });

    await db.insert(education).values({
      id: randomUUID(),
      profileId,
      institution: 'ETH Zurich',
      degree: 'MSc Computer Science',
      startDate: '2020-09',
      endDate: '2022-06',
    });

    docAId = randomUUID();
    await db.insert(documents).values({
      id: docAId,
      userId: userAId,
      type: 'resume',
      templateId: 'ats_single_column',
      title: 'Import Source Test Doc',
      accentColor: '#0B0B0B',
      status: 'draft',
      version: 1,
    });

    const signInAndGetCookies = async (email: string) => {
      const jar: Record<string, string> = {};
      const ssr = createServerClient(supabaseUrl!, anonKey!, {
        cookies: {
          getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
          setAll: (list) => list.forEach(({ name, value }) => (jar[name] = value)),
        },
      });
      const { error } = await ssr.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      return Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    };

    userACookies = await signInAndGetCookies(emailA);
    userBCookies = await signInAndGetCookies(emailB);
  });

  afterAll(async () => {
    if (userAId) {
      await db.delete(documents).where(eq(documents.userId, userAId));
      await db.delete(masterProfiles).where(eq(masterProfiles.userId, userAId));
      await adminClient.auth.admin.deleteUser(userAId);
    }
    if (userBId) {
      await adminClient.auth.admin.deleteUser(userBId);
    }
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${docAId}/import-source?section=education`);
    expect(res.status).toBe(401);
  });

  it('returns 400 when section query param is missing or invalid', async () => {
    const resMissing = await fetch(`${BASE_URL}/api/documents/${docAId}/import-source`, {
      headers: { Cookie: userACookies },
    });
    expect(resMissing.status).toBe(400);

    const resInvalid = await fetch(
      `${BASE_URL}/api/documents/${docAId}/import-source?section=nonexistent`,
      { headers: { Cookie: userACookies } }
    );
    expect(resInvalid.status).toBe(400);
  });

  it('returns 404 when another user requests import-source for a document they do not own', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${docAId}/import-source?section=education`, {
      headers: { Cookie: userBCookies },
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with hasData=true and fresh entry IDs for populated master profile section', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${docAId}/import-source?section=education`, {
      headers: { Cookie: userACookies },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasData).toBe(true);
    expect(data.count).toBe(1);
    expect(data.entries[0].institution).toBe('ETH Zurich');
    expect(data.entries[0].id).toBeTruthy();
    expect(data.entries[0].sourceId).toBeTruthy();
  });

  it('returns 200 with hasData=false when master profile has no entries for that section', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/${docAId}/import-source?section=experience`, {
      headers: { Cookie: userACookies },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasData).toBe(false);
    expect(data.count).toBe(0);
    expect(data.entries).toEqual([]);
  });
});
