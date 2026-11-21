import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { FIELD_SPECS, createPayload } from '../../lib/validation/field-specs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3101';

describe('HTTP Route Invariant Verification: sends fields through /api/documents/[documentId]/save', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  let testDocId: string;
  let cookieHeader: string;
  let currentVersion = 1;

  beforeAll(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    adminClient = createClient(supabaseUrl, serviceRoleKey);

    const testEmail = `test-http-inv-${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    const { data: userAuth, error: authErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (authErr || !userAuth.user) throw new Error(`User creation failed: ${authErr?.message}`);
    testUserId = userAuth.user.id;

    testDocId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : '11111111-2222-3333-4444-555555555555';
    await adminClient.from('documents').insert({
      id: testDocId,
      user_id: testUserId,
      title: 'HTTP Route Invariant Doc',
      type: 'resume',
      template_id: 'ats_single_column',
      accent_color: '#0B0B0B',
      version: 1,
    } as any);

    await adminClient.from('document_sections').insert({
      id: '11111111-1111-4111-a111-111111111111',
      document_id: testDocId,
      section_type: 'header',
      title: 'HEADER',
      order_index: 0,
      is_visible: true,
      content: {
        schema_version: '1.0.0',
        fullName: 'Test User',
        headline: 'Initial Headline',
      },
    } as any);

    const capturedCookies: Record<string, string> = {};
    const ssrClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return Object.entries(capturedCookies).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            capturedCookies[name] = value;
          });
        },
      },
    });

    await ssrClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    cookieHeader = Object.entries(capturedCookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  });

  afterAll(async () => {
    if (adminClient && testUserId) {
      await adminClient.from('documents').delete().eq('user_id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  // 1 through 26: Individual field limit vs limit+1 invariant tests
  for (const spec of FIELD_SPECS) {
    it(`field invariant: ${spec.sectionType}.${spec.fieldKey} (200 @ ${spec.inputMaxLength}, 400 @ ${spec.inputMaxLength + 1})`, async () => {
      // Step A: Limit + 1 must return 400
      const overPayload = createPayload(spec, spec.inputMaxLength + 1);
      const resOver = await fetch(`${BASE_URL}/api/documents/${testDocId}/save`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          clientVersion: currentVersion,
          sections: [
            {
              id: '11111111-1111-4111-a111-111111111111',
              sectionType: spec.sectionType,
              title: spec.sectionType.toUpperCase(),
              orderIndex: 0,
              isVisible: true,
              content: overPayload,
            },
          ],
        }),
      });

      const overData = await resOver.json();
      expect(resOver.status, `Expected 400 for ${spec.fieldKey} at limit+1, got ${resOver.status}`).toBe(400);
      expect(typeof overData.error).toBe('string');
      expect(overData.error).toMatch(/Validation error/);

      // Step B: Limit exact must return 200
      const limitPayload = createPayload(spec, spec.inputMaxLength);
      const resLimit = await fetch(`${BASE_URL}/api/documents/${testDocId}/save`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          clientVersion: currentVersion,
          sections: [
            {
              id: '11111111-1111-4111-a111-111111111111',
              sectionType: spec.sectionType,
              title: spec.sectionType.toUpperCase(),
              orderIndex: 0,
              isVisible: true,
              content: limitPayload,
            },
          ],
        }),
      });

      const limitData = await resLimit.json();
      expect(resLimit.status, `Expected 200 for ${spec.fieldKey} at limit, got ${resLimit.status}`).toBe(200);
      currentVersion = limitData.newVersion;
    });
  }

  // 27: Payload size limit check (content exceeding 64KB rejected with 400)
  it('payload invariant: section content exceeding 64KB returns 400', async () => {
    const hugePayload = {
      schema_version: '1.0.0',
      text: 'X'.repeat(66000),
    };
    const res = await fetch(`${BASE_URL}/api/documents/${testDocId}/save`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        clientVersion: currentVersion,
        sections: [
          {
            id: '11111111-1111-4111-a111-111111111111',
            sectionType: 'summary',
            title: 'SUMMARY',
            orderIndex: 0,
            isVisible: true,
            content: hugePayload,
          },
        ],
      }),
    });
    expect(res.status).toBe(400);
  });

  // 28: Concurrency conflict check: stale clientVersion returns 409
  it('concurrency invariant: stale clientVersion returns 409 STALE_SAVE_CONFLICT', async () => {
    const resConflict = await fetch(`${BASE_URL}/api/documents/${testDocId}/save`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        clientVersion: 1, // Stale version
        sections: [
          {
            id: '11111111-1111-4111-a111-111111111111',
            sectionType: 'header',
            title: 'HEADER',
            orderIndex: 0,
            isVisible: true,
            content: { schema_version: '1.0.0', fullName: 'Stale Edit' },
          },
        ],
      }),
    });
    const data = await resConflict.json();
    expect(resConflict.status).toBe(409);
    expect(data.error).toBe('STALE_SAVE_CONFLICT');
  });
});
