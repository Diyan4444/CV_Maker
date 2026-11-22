import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';
import { assertTestProjectRefAllowed } from '../../lib/test-utils/production-guard';
import { db } from '../../lib/db';
import { documents, documentSections } from '../../lib/db/schema';
import { eq, inArray, count } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3101';

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

  const emailA = `test-api-a-${Date.now()}@quillfolio.local`;
  const emailB = `test-api-b-${Date.now()}@quillfolio.local`;
  const password = 'TestSecurePass123!';

  beforeAll(async () => {
    // Production Safety Guard: Assert project ref is allowlisted
    assertTestProjectRefAllowed(supabaseUrl);

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

  // Group 1: 401 UNAUTHORIZED for unauthenticated requests across API routes
  it('1. GET /api/documents/[id] without auth returns 401 UNAUTHORIZED', async () => {
    const getRes = await fetch(`${BASE_URL}/api/documents/${docAId}`);
    expect(getRes.status).toBe(401);
    const getData = await getRes.json();
    expect(getData.error).toBe('UNAUTHORIZED');
  });

  it('2. POST /api/documents/create without auth returns 401 UNAUTHORIZED', async () => {
    const postRes = await fetch(`${BASE_URL}/api/documents/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthenticated Doc' }),
    });
    expect(postRes.status).toBe(401);
  });

  it('3. PUT /api/documents/[id]/save without auth returns 401 UNAUTHORIZED', async () => {
    const putRes = await fetch(`${BASE_URL}/api/documents/${docAId}/save`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientVersion: 1, sections: [] }),
    });
    expect(putRes.status).toBe(401);
  });

  it('4. POST /api/profile/save without auth returns 401 UNAUTHORIZED', async () => {
    const profRes = await fetch(`${BASE_URL}/api/profile/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: {} }),
    });
    expect(profRes.status).toBe(401);
  });

  // Group 2: Cross-user tenant isolation (404 NOT FOUND)
  it("5. User B attempting GET User A document returns 404 NOT FOUND", async () => {
    const getRes = await fetch(`${BASE_URL}/api/documents/${docAId}`, {
      headers: { Cookie: userBCookies },
    });
    expect(getRes.status).toBe(404);
  });

  it("6. User B attempting PUT/save User A document returns 404 NOT FOUND", async () => {
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
  });

  it("7. User B attempting POST/duplicate User A document returns 404 NOT FOUND", async () => {
    const dupRes = await fetch(`${BASE_URL}/api/documents/${docAId}/duplicate`, {
      method: 'POST',
      headers: { Cookie: userBCookies },
    });
    expect(dupRes.status).toBe(404);
  });

  it("8. User B attempting DELETE User A document returns 404 NOT FOUND", async () => {
    const delRes = await fetch(`${BASE_URL}/api/documents/${docAId}/delete`, {
      method: 'DELETE',
      headers: { Cookie: userBCookies },
    });
    expect(delRes.status).toBe(404);
  });

  it("9. User A can successfully fetch their own document (200 OK)", async () => {
    const checkRes = await fetch(`${BASE_URL}/api/documents/${docAId}`, {
      headers: { Cookie: userACookies },
    });
    expect(checkRes.status).toBe(200);
  });

  // Group 3 & 4: Payload validation
  it('10. PUT /api/documents/[id]/save with invalid section payload returns 400 Validation error', async () => {
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

  it('11. PUT /api/documents/[id]/save with oversized section payload (>64KB) returns 400', async () => {
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

  // Group 5: POST /api/documents/create-copy
  it('12. POST /api/documents/create-copy without auth returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/create-copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Copy',
        type: 'resume',
        sections: [],
      }),
    });
    expect(res.status).toBe(401);
  });

  it('13. POST /api/documents/create-copy with invalid section content returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/create-copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookies },
      body: JSON.stringify({
        title: 'Invalid Copy',
        type: 'resume',
        sections: [
          {
            sectionType: 'header',
            title: 'Header',
            content: { fullName: '' }, // empty full name fails min(1) validation
          },
        ],
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Validation error');
  });

  it('14. POST /api/documents/create-copy creates independent document with new section IDs, untouched original, and enforced ownership', async () => {
    const copyRes = await fetch(`${BASE_URL}/api/documents/create-copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookies },
      body: JSON.stringify({
        title: 'User A Recovered Copy',
        type: 'resume',
        templateId: 'modern_professional',
        accentColor: '#800021',
        sections: [
          {
            id: 'legacy-frontend-sec-id-1',
            sectionType: 'header',
            title: 'Contact Details',
            orderIndex: 0,
            isVisible: true,
            content: {
              schema_version: '1.0.0',
              fullName: 'Alex Example',
              email: 'alex@example.com',
              phone: '+1 555-0100',
              city: 'Metropolis',
              country: 'United States',
              headline: 'Principal Systems Architect',
            },
          },
          {
            id: 'legacy-frontend-sec-id-2',
            sectionType: 'summary',
            title: 'Executive Summary',
            orderIndex: 1,
            isVisible: true,
            content: {
              schema_version: '1.0.0',
              text: 'Seasoned engineer specializing in distributed consensus and fault-tolerant cloud architecture.',
            },
          },
        ],
      }),
    });

    expect(copyRes.status).toBe(200);
    const copyData = await copyRes.json();
    expect(copyData.success).toBe(true);
    expect(copyData.documentId).toBeTruthy();
    expect(copyData.documentId).not.toBe(docAId);

    // Verify original docAId is still intact and unchanged
    const originalDocRes = await fetch(`${BASE_URL}/api/documents/${docAId}`, {
      headers: { Cookie: userACookies },
    });
    expect(originalDocRes.status).toBe(200);
    const originalDoc = await originalDocRes.json();
    expect(originalDoc.meta.id).toBe(docAId);
    expect(originalDoc.meta.version).toBe(1);

    // Verify new document exists and has version: 1
    const newDocRes = await fetch(`${BASE_URL}/api/documents/${copyData.documentId}`, {
      headers: { Cookie: userACookies },
    });
    expect(newDocRes.status).toBe(200);
    const newDoc = await newDocRes.json();
    expect(newDoc.meta.id).toBe(copyData.documentId);
    expect(newDoc.meta.version).toBe(1);
    expect(newDoc.meta.title).toBe('User A Recovered Copy');
    expect(newDoc.sections.length).toBe(2);

    // 1. Verify cloned sections get brand new IDs (not legacy IDs from payload)
    expect(newDoc.sections[0].id).not.toBe('legacy-frontend-sec-id-1');
    expect(newDoc.sections[1].id).not.toBe('legacy-frontend-sec-id-2');

    // 2. Verify ownership is strictly enforced: User B cannot access User A's new copy (404)
    const unauthorizedAccessRes = await fetch(`${BASE_URL}/api/documents/${copyData.documentId}`, {
      headers: { Cookie: userBCookies },
    });
    expect(unauthorizedAccessRes.status).toBe(404);
  });

  it('15. POST /api/documents/create-copy when user reaches 20-document cap returns 400 with friendly message', async () => {
    // Determine how many documents user A currently has
    const { count: currentCount } = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.userId, userAId))
      .then((rows) => ({ count: Number(rows[0]?.count || 0) }));

    // Insert dummy documents until user A reaches 20
    const dummyIds: string[] = [];
    const needed = Math.max(0, 20 - currentCount);
    for (let i = 0; i < needed; i++) {
      const dummyId = randomUUID();
      dummyIds.push(dummyId);
      await db.insert(documents).values({
        id: dummyId,
        userId: userAId,
        title: `Dummy Cap Document ${i + 1}`,
        type: 'resume',
        templateId: 'ats_single_column',
        accentColor: '#0B0B0B',
        version: 1,
      });
    }

    try {
      // Attempt create-copy when cap of 20 is met
      const capRes = await fetch(`${BASE_URL}/api/documents/create-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userACookies },
        body: JSON.stringify({
          title: '21st Document Copy',
          type: 'resume',
          sections: [
            {
              sectionType: 'header',
              title: 'Header',
              content: {
                fullName: 'Alex Example',
                email: 'alex@example.com',
                schema_version: '1.0.0',
              },
            },
          ],
        }),
      });

      expect(capRes.status).toBe(400);
      const capData = await capRes.json();
      expect(capData.code).toBe('DOCUMENT_LIMIT_REACHED');
      expect(capData.error).toBe(
        'You have reached the maximum limit of 20 documents. Please delete an older document to create a new one.'
      );
    } finally {
      // Clean up the dummy documents
      if (dummyIds.length > 0) {
        await db.delete(documents).where(inArray(documents.id, dummyIds));
      }
    }
  });

  it("16. POST /api/documents/create-copy ignores another user's documentId/userId in payload and enforces caller ownership with new IDs", async () => {
    // User B attempts to pass User A's documentId and userId in create-copy payload
    const spoofAttemptRes = await fetch(`${BASE_URL}/api/documents/create-copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userBCookies },
      body: JSON.stringify({
        id: docAId,
        documentId: docAId,
        userId: userAId,
        user_id: userAId,
        title: 'User B Document Cloned from Foreign Context',
        type: 'resume',
        sections: [
          {
            id: 'injected-foreign-sec-id',
            sectionType: 'header',
            title: 'Injected Header',
            content: {
              fullName: 'User B Spoofed Name',
              email: 'userb@example.com',
              schema_version: '1.0.0',
            },
          },
        ],
      }),
    });

    expect(spoofAttemptRes.status).toBe(200);
    const spoofData = await spoofAttemptRes.json();
    expect(spoofData.success).toBe(true);

    // Document ID must NOT be User A's documentId
    expect(spoofData.documentId).toBeTruthy();
    expect(spoofData.documentId).not.toBe(docAId);

    // Verify User A's original document is completely unaffected
    const checkDocARes = await fetch(`${BASE_URL}/api/documents/${docAId}`, {
      headers: { Cookie: userACookies },
    });
    expect(checkDocARes.status).toBe(200);
    const docAContent = await checkDocARes.json();
    expect(docAContent.meta.title).toBe('User A Confidential Resume');
    expect(docAContent.meta.userId).toBe(userAId);

    // Verify the newly created document is owned by User B (caller), NOT User A
    const userBFetchRes = await fetch(`${BASE_URL}/api/documents/${spoofData.documentId}`, {
      headers: { Cookie: userBCookies },
    });
    expect(userBFetchRes.status).toBe(200);
    const userBDoc = await userBFetchRes.json();
    expect(userBDoc.meta.userId).toBe(userBId);
    expect(userBDoc.meta.title).toBe('User B Document Cloned from Foreign Context');

    // Verify sections have new generated IDs and not the injected ID
    expect(userBDoc.sections[0].id).not.toBe('injected-foreign-sec-id');

    // Clean up created doc
    await db.delete(documentSections).where(eq(documentSections.documentId, spoofData.documentId));
    await db.delete(documents).where(eq(documents.id, spoofData.documentId));
  });
});
