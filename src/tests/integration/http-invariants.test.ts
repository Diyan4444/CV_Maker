import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { FIELD_SPECS, createPayload } from '../field-invariants.test';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3101';

describe('HTTP Route Invariant Verification: sends fields through /api/documents/[documentId]/save', () => {
  let adminClient: ReturnType<typeof createClient>;
  let testUserId: string;
  let testDocId: string;
  let cookieHeader: string;

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

  it(
    'asserts 200 at limit and 400 at limit+1 through HTTP save route (0 unhandled 500s)',
    async () => {
      const testCases = [
        { section: 'header', field: 'headline', limit: 300 },
        { section: 'experience', field: 'role', limit: 200 },
        { section: 'education', field: 'institution', limit: 255 },
      ];

      let currentVersion = 1;

      for (const tc of testCases) {
        const spec = FIELD_SPECS.find((s) => s.columnOrProperty === tc.field)!;

        // 1. Limit + 1 => must return 400
        const overPayload = createPayload(spec, tc.limit + 1);
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
        expect(resOver.status, `Expected 400 for ${tc.field} at limit+1, got ${resOver.status}`).toBe(400);
        expect(typeof overData.error).toBe('string');
        expect(overData.error).toMatch(/Validation error/);

        // 2. Exact limit => must return 200
        const atLimitPayload = createPayload(spec, tc.limit);
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
                content: atLimitPayload,
              },
            ],
          }),
        });

        const limitData = await resLimit.json();
        expect(resLimit.status, `Expected 200 for ${tc.field} at limit, got ${resLimit.status}: ${JSON.stringify(limitData)}`).toBe(200);
        currentVersion = limitData.newVersion;
      }
    },
    30000
  );
});
