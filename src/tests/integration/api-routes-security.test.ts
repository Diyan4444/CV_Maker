import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3100';

const hasCredentials = Boolean(
  supabaseUrl && anonKey && serviceKey && !supabaseUrl.includes('placeholder')
);

describe.skipIf(!hasCredentials)('API Routes Security & Verification (Real HTTP Requests)', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAId: string;
  let userBId: string;
  let userACookies: string = '';
  let userBCookies: string = '';
  let docAId: string = '';

  const emailA = `test-api-a-${Date.now()}@folioone.local`;
  const emailB = `test-api-b-${Date.now()}@folioone.local`;
  const password = 'TestSecurePass123!';

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create User A and User B
    const resA = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'API User A' },
    });
    if (resA.error) throw resA.error;
    userAId = resA.data.user.id;

    const resB = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'API User B' },
    });
    if (resB.error) throw resB.error;
    userBId = resB.data.user.id;

    // 2. Obtain real session cookies for User A
    const capturedA: Record<string, string> = {};
    const ssrClientA = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll: () => Object.entries(capturedA).map(([name, value]) => ({ name, value })),
        setAll: (toSet) => toSet.forEach((c) => { capturedA[c.name] = c.value; }),
      },
    });
    const { error: errA } = await ssrClientA.auth.signInWithPassword({ email: emailA, password });
    if (errA) throw errA;
    userACookies = Object.entries(capturedA).map(([k, v]) => `${k}=${v}`).join('; ');

    // 3. Obtain real session cookies for User B
    const capturedB: Record<string, string> = {};
    const ssrClientB = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll: () => Object.entries(capturedB).map(([name, value]) => ({ name, value })),
        setAll: (toSet) => toSet.forEach((c) => { capturedB[c.name] = c.value; }),
      },
    });
    const { error: errB } = await ssrClientB.auth.signInWithPassword({ email: emailB, password });
    if (errB) throw errB;
    userBCookies = Object.entries(capturedB).map(([k, v]) => `${k}=${v}`).join('; ');

    // 4. Create Document A via HTTP API for User A
    const createRes = await fetch(`${BASE_URL}/api/documents/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookies,
      },
      body: JSON.stringify({
        title: 'User A Confidential Resume',
        type: 'resume',
        templateId: 'ats_single_column',
        accentColor: '#800021',
      }),
    });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    docAId = createData.documentId;
    expect(docAId).toBeTruthy();
  });

  afterAll(async () => {
    if (adminClient) {
      if (userAId) await adminClient.auth.admin.deleteUser(userAId);
      if (userBId) await adminClient.auth.admin.deleteUser(userBId);
    }
  });

  it('1. returns 401 UNAUTHORIZED when unauthenticated request calls API routes', async () => {
    // GET /api/documents/[id] without auth
    const getRes = await fetch(`${BASE_URL}/api/documents/${docAId}`);
    expect(getRes.status).toBe(401);
    const getData = await getRes.json();
    expect(getData.error).toBe('UNAUTHORIZED');

    // POST /api/documents/create without auth
    const postRes = await fetch(`${BASE_URL}/api/documents/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthenticated Doc' }),
    });
    expect(postRes.status).toBe(401);

    // PUT /api/documents/[id]/save without auth
    const putRes = await fetch(`${BASE_URL}/api/documents/${docAId}/save`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientVersion: 1, sections: [] }),
    });
    expect(putRes.status).toBe(401);

    // POST /api/profile/save without auth
    const profRes = await fetch(`${BASE_URL}/api/profile/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {} }),
    });
    expect(profRes.status).toBe(401);
  });

  it("2. returns 404 when another user attempts to read, save, duplicate, or delete User A's document", async () => {
    // User B attempts to GET User A document
    const getRes = await fetch(`${BASE_URL}/api/documents/${docAId}`, {
      headers: { Cookie: userBCookies },
    });
    expect(getRes.status).toBe(404);

    // User B attempts to save/overwrite User A document
    const saveRes = await fetch(`${BASE_URL}/api/documents/${docAId}/save`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: userBCookies },
      body: JSON.stringify({
        clientVersion: 1,
        meta: { title: 'Hacked by User B' },
        sections: [],
      }),
    });
    expect(saveRes.status).toBe(404);

    // User B attempts to duplicate User A document
    const dupRes = await fetch(`${BASE_URL}/api/documents/${docAId}/duplicate`, {
      method: 'POST',
      headers: { Cookie: userBCookies },
    });
    expect(dupRes.status).toBe(404);

    // User B attempts to delete User A document
    const delRes = await fetch(`${BASE_URL}/api/documents/${docAId}/delete`, {
      method: 'DELETE',
      headers: { Cookie: userBCookies },
    });
    expect(delRes.status).toBe(404);

    // Confirm User A can still fetch their own document successfully
    const checkRes = await fetch(`${BASE_URL}/api/documents/${docAId}`, {
      headers: { Cookie: userACookies },
    });
    expect(checkRes.status).toBe(200);
  });

  it('3. returns 400 when an invalid section payload is submitted', async () => {
    const invalidSaveRes = await fetch(`${BASE_URL}/api/documents/${docAId}/save`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: userACookies },
      body: JSON.stringify({
        clientVersion: 1,
        sections: [
          {
            sectionType: 'unknown_fake_section_type',
            title: 'Invalid Fake Section',
            orderIndex: 0,
            isVisible: true,
            content: { something: true },
          },
        ],
      }),
    });

    expect(invalidSaveRes.status).toBe(400);
    const data = await invalidSaveRes.json();
    expect(data.error).toContain('Validation error');
    expect(data.error).toContain('Unknown section type');
  });

  it('4. rejects an oversized section payload exceeding the 64KB database limit', async () => {
    // Generate a payload exceeding 64KB (65536 bytes)
    const giantText = 'X'.repeat(70000);
    const oversizedSaveRes = await fetch(`${BASE_URL}/api/documents/${docAId}/save`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: userACookies },
      body: JSON.stringify({
        clientVersion: 1,
        sections: [
          {
            sectionType: 'summary',
            title: 'Professional Summary',
            orderIndex: 0,
            isVisible: true,
            content: {
              schema_version: '1.0.0',
              text: giantText,
            },
          },
        ],
      }),
    });

    expect(oversizedSaveRes.status).toBe(400);
    const data = await oversizedSaveRes.json();
    expect(data.error).toContain('exceeds the 64KB database limit');
  });

  afterAll(async () => {
    if (adminClient) {
      if (userAId) await adminClient.auth.admin.deleteUser(userAId);
      if (userBId) await adminClient.auth.admin.deleteUser(userBId);
    }
  });
});
