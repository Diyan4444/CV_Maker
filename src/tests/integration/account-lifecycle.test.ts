import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';
import { assertTestProjectRefAllowed } from '../../lib/test-utils/production-guard';
import { EXCLUDED_COLUMNS, AccountExportDataSchema } from '../../lib/account/export-schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3101';

const hasCredentials = Boolean(
  supabaseUrl && anonKey && serviceKey && dbUrl && !supabaseUrl.includes('placeholder')
);

describe.skipIf(!hasCredentials)('Account Lifecycle Integration: Export, Deletion & Cascades (Port 3101)', () => {
  let adminClient: ReturnType<typeof createClient>;
  let sql: postgres.Sql;

  let userAId: string;
  let userBId: string;
  let userACookies: string = '';
  let userBCookies: string = '';
  let masterProfileAId: string = '';
  let docAId: string = '';

  const emailA = `test-lifecycle-a-${Date.now()}@quillfolio.local`;
  const emailB = `test-lifecycle-b-${Date.now()}@quillfolio.local`;
  const password = 'TestSecurePass123!';

  // Helper to obtain fresh session cookies for an email/password
  async function getSessionCookie(email: string): Promise<string> {
    const captured: Record<string, string> = {};
    const ssrClient = createServerClient(supabaseUrl!, anonKey!, {
      cookies: {
        getAll: () => Object.entries(captured).map(([name, value]) => ({ name, value })),
        setAll: (toSet) => {
          toSet.forEach((c) => {
            captured[c.name] = c.value;
          });
        },
      },
    });
    const { error } = await ssrClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return Object.entries(captured)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  beforeAll(async () => {
    assertTestProjectRefAllowed(supabaseUrl);

    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    sql = postgres(dbUrl!, { prepare: false, max: 1 });

    // 1. Create throwaway User A
    const resA = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Lifecycle User A' },
    });
    if (resA.error) throw resA.error;
    userAId = resA.data.user.id;

    // 2. Create throwaway User B
    const resB = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Lifecycle User B' },
    });
    if (resB.error) throw resB.error;
    userBId = resB.data.user.id;

    // 3. Obtain session cookies
    userACookies = await getSessionCookie(emailA);
    userBCookies = await getSessionCookie(emailB);

    // 4. Seed User A data across all 14 tables directly
    // Ensure profiles row exists
    await sql`
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (${userAId}, ${emailA}, 'Lifecycle User A')
      ON CONFLICT (id) DO UPDATE SET full_name = 'Lifecycle User A'
    `;
    await sql`
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (${userBId}, ${emailB}, 'Lifecycle User B')
      ON CONFLICT (id) DO UPDATE SET full_name = 'Lifecycle User B'
    `;

    // Master profile
    const [mpA] = await sql`
      INSERT INTO public.master_profiles (user_id, headline, summary)
      VALUES (${userAId}, 'Lead Engineer', 'Experienced software architect.')
      RETURNING id
    `;
    masterProfileAId = mpA.id;

    const [mpB] = await sql`
      INSERT INTO public.master_profiles (user_id, headline, summary)
      VALUES (${userBId}, 'Data Scientist', 'Specialist in machine learning.')
      RETURNING id
    `;

    // Child profile tables for User A and User B
    await sql`INSERT INTO public.education (profile_id, institution, degree, order_index) VALUES (${masterProfileAId}, 'MIT', 'B.S. CS', 0)`;
    await sql`INSERT INTO public.education (profile_id, institution, degree, order_index) VALUES (${mpB.id}, 'Stanford', 'Ph.D.', 0)`;

    await sql`INSERT INTO public.experiences (profile_id, type, organization, role, order_index) VALUES (${masterProfileAId}, 'job', 'Acme Corp', 'Principal Architect', 0)`;
    await sql`INSERT INTO public.experiences (profile_id, type, organization, role, order_index) VALUES (${mpB.id}, 'job', 'Beta Labs', 'Researcher', 0)`;

    await sql`INSERT INTO public.projects (profile_id, title, role, order_index) VALUES (${masterProfileAId}, 'Project Alpha', 'Author', 0)`;
    await sql`INSERT INTO public.skills (profile_id, category, items, order_index) VALUES (${masterProfileAId}, 'Languages', '["TypeScript", "Rust"]'::jsonb, 0)`;
    await sql`INSERT INTO public.publications (profile_id, title, authors, order_index) VALUES (${masterProfileAId}, 'Distributed Invariants', '["A. User"]'::jsonb, 0)`;
    await sql`INSERT INTO public.achievements (profile_id, title, order_index) VALUES (${masterProfileAId}, 'Outstanding Engineering Award', 0)`;
    await sql`INSERT INTO public.certifications (profile_id, name, issuer, order_index) VALUES (${masterProfileAId}, 'Security Specialist', 'CyberCert', 0)`;
    await sql`INSERT INTO public.custom_sections (profile_id, section_title, entries, order_index) VALUES (${masterProfileAId}, 'Open Source', '[{"title": "Library"}]'::jsonb, 0)`;

    // Documents & Document Sections for User A and User B
    const [docA] = await sql`
      INSERT INTO public.documents (user_id, title, type, template_id)
      VALUES (${userAId}, 'User A Resume', 'resume', 'modern_professional')
      RETURNING id
    `;
    docAId = docA.id;

    await sql`
      INSERT INTO public.document_sections (document_id, section_type, title, order_index, content)
      VALUES (${docAId}, 'experience', 'Experience', 0, '{"text": "Built systems"}'::jsonb)
    `;

    const [docB] = await sql`
      INSERT INTO public.documents (user_id, title, type, template_id)
      VALUES (${userBId}, 'User B Resume', 'resume', 'modern_professional')
      RETURNING id
    `;
    await sql`
      INSERT INTO public.document_sections (document_id, section_type, title, order_index, content)
      VALUES (${docB.id}, 'experience', 'Work History', 0, '{"text": "Data models"}'::jsonb)
    `;

    // Website for User A and User B
    await sql`
      INSERT INTO public.websites (user_id, username, is_published, custom_headline)
      VALUES (${userAId}, ${'lifecycle-a-' + Date.now()}, true, 'User A Site')
    `;
    await sql`
      INSERT INTO public.websites (user_id, username, is_published, custom_headline)
      VALUES (${userBId}, ${'lifecycle-b-' + Date.now()}, true, 'User B Site')
    `;

    // AI Usage Logs
    await sql`
      INSERT INTO public.ai_usage_logs (user_id, action_type, prompt_tokens, completion_tokens)
      VALUES (${userAId}, 'tailor_bullet', 120, 45)
    `;
    await sql`
      INSERT INTO public.ai_usage_logs (user_id, action_type, prompt_tokens, completion_tokens)
      VALUES (${userBId}, 'tailor_bullet', 200, 60)
    `;
  });

  afterAll(async () => {
    // Cleanup any lingering throwaway test users created by this test file only
    try {
      if (userBId) await adminClient.auth.admin.deleteUser(userBId);
      if (userAId) await adminClient.auth.admin.deleteUser(userAId);
    } catch {}
    if (sql) await sql.end({ timeout: 5 });
  });

  /* ==========================================================================
     1. DATA EXPORT API TESTS
     ========================================================================== */
  describe('GET /api/account/export', () => {
    it('returns 401 Unauthorized when called without session cookies', async () => {
      const res = await fetch(`${BASE_URL}/api/account/export`);
      expect(res.status).toBe(401);
    });

    it('returns 200 OK with valid attachment download header and valid JSON payload', async () => {
      const res = await fetch(`${BASE_URL}/api/account/export`, {
        headers: { Cookie: userACookies },
      });
      expect(res.status).toBe(200);

      const disposition = res.headers.get('content-disposition');
      expect(disposition).toContain('attachment');
      expect(disposition).toMatch(/quillfolio-export-\d{4}-\d{2}-\d{2}\.json/);

      const cacheControl = res.headers.get('cache-control');
      expect(cacheControl).toContain('no-store');

      const data = await res.json();
      const parsed = AccountExportDataSchema.parse(data);
      expect(parsed.account.id).toBe(userAId);
      expect(parsed.account.email).toBe(emailA);
      expect(parsed.profile).not.toBeNull();
      expect(parsed.masterProfile).not.toBeNull();
      expect(parsed.education.length).toBeGreaterThanOrEqual(1);
      expect(parsed.experiences.length).toBeGreaterThanOrEqual(1);
      expect(parsed.projects.length).toBeGreaterThanOrEqual(1);
      expect(parsed.skills.length).toBeGreaterThanOrEqual(1);
      expect(parsed.publications.length).toBeGreaterThanOrEqual(1);
      expect(parsed.achievements.length).toBeGreaterThanOrEqual(1);
      expect(parsed.certifications.length).toBeGreaterThanOrEqual(1);
      expect(parsed.customSections.length).toBeGreaterThanOrEqual(1);
      expect(parsed.documents.length).toBeGreaterThanOrEqual(1);
      expect(parsed.documents[0].sections.length).toBeGreaterThanOrEqual(1);
      expect(parsed.website).not.toBeNull();
      expect(parsed.aiUsageLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('enforces strict tenant isolation: User B data never appears in User A export', async () => {
      const res = await fetch(`${BASE_URL}/api/account/export`, {
        headers: { Cookie: userACookies },
      });
      const data = await res.json();
      const rawText = JSON.stringify(data);

      expect(rawText).not.toContain(userBId);
      expect(rawText).not.toContain(emailB);
      expect(rawText).not.toContain('Lifecycle User B');
      expect(rawText).not.toContain('Stanford');
      expect(rawText).not.toContain('Beta Labs');
      expect(rawText).not.toContain('User B Resume');

      // Verify inverse isolation: User B export contains User B data and zero User A data
      const resB = await fetch(`${BASE_URL}/api/account/export`, {
        headers: { Cookie: userBCookies },
      });
      const dataB = await resB.json();
      const rawTextB = JSON.stringify(dataB);
      expect(rawTextB).toContain(userBId);
      expect(rawTextB).not.toContain(userAId);
      expect(rawTextB).not.toContain(emailA);
    });

    it('verifies dynamic column coverage against information_schema across all 14 tables', async () => {
      const res = await fetch(`${BASE_URL}/api/account/export`, {
        headers: { Cookie: userACookies },
      });
      const data = await res.json();

      const tableMapping: Record<string, any> = {
        profiles: data.profile,
        master_profiles: data.masterProfile,
        education: data.education[0],
        experiences: data.experiences[0],
        projects: data.projects[0],
        skills: data.skills[0],
        publications: data.publications[0],
        achievements: data.achievements[0],
        certifications: data.certifications[0],
        custom_sections: data.customSections[0],
        documents: data.documents[0],
        document_sections: data.documents[0]?.sections[0],
        websites: data.website,
        ai_usage_logs: data.aiUsageLogs[0],
      };

      for (const [tableName, exportedRow] of Object.entries(tableMapping)) {
        expect(exportedRow).toBeDefined();

        const realCols = await sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${tableName}
        `;

        const rowKeys = Object.keys(exportedRow);
        const excludedForTable = EXCLUDED_COLUMNS[tableName] || [];

        for (const col of realCols) {
          const colName = col.column_name;
          const isExplicitlyExcluded = excludedForTable.some((e) => e.column === colName);

          if (!isExplicitlyExcluded) {
            expect(
              rowKeys.includes(colName),
              `Table "${tableName}" column "${colName}" is missing from export without being in EXCLUDED_COLUMNS.`
            ).toBe(true);
          }
        }
      }
    });
  });

  /* ==========================================================================
     2. ACCOUNT DELETION API & CASCADE TESTS
     ========================================================================== */
  describe('POST /api/account/delete', () => {
    it('returns 401 Unauthorized when called without session cookies', async () => {
      const res = await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: BASE_URL,
        },
        body: JSON.stringify({ confirmEmail: emailA }),
      });
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when Origin header does not match site origin', async () => {
      const res = await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://evil-attacker.example.com',
          Cookie: userACookies,
        },
        body: JSON.stringify({ confirmEmail: emailA }),
      });
      expect(res.status).toBe(403);
    });

    it('returns 400 Bad Request when confirmEmail does not match account email', async () => {
      const res = await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: BASE_URL,
          Cookie: userACookies,
        },
        body: JSON.stringify({ confirmEmail: 'wrong-email@example.com' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('EMAIL_MISMATCH');
    });

    it('returns 403 REAUTH_REQUIRED when sign-in timestamp exceeds window (window=1s, wait 2s)', async () => {
      // Wait 2.1 seconds so that user.last_sign_in_at is older than ACCOUNT_REAUTH_WINDOW_SECONDS=1
      await new Promise((r) => setTimeout(r, 2100));

      const res = await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: BASE_URL,
          Cookie: userACookies,
        },
        body: JSON.stringify({ confirmEmail: emailA }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe('REAUTH_REQUIRED');
    });

    it('returns 200 OK on fresh sign-in and cascades deletion across all 14 tables', async () => {
      // 1. Fresh sign-in to get new last_sign_in_at timestamp within window
      const freshCookies = await getSessionCookie(emailA);

      // 2. Execute deletion immediately
      const res = await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: BASE_URL,
          Cookie: freshCookies,
        },
        body: JSON.stringify({ confirmEmail: emailA }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      // 3. Verify user is deleted from auth.users
      const { data: authUserRes } = await adminClient.auth.admin.getUserById(userAId);
      expect(authUserRes?.user).toBeNull();

      // 4. Verify COUNT(*) is zero in EVERY table referencing User A (all 14 tables)
      const [profilesCount] = await sql`SELECT count(*)::int as c FROM public.profiles WHERE id = ${userAId}`;
      expect(profilesCount.c).toBe(0);

      const [masterProfilesCount] = await sql`SELECT count(*)::int as c FROM public.master_profiles WHERE user_id = ${userAId}`;
      expect(masterProfilesCount.c).toBe(0);

      const [eduCount] = await sql`SELECT count(*)::int as c FROM public.education WHERE profile_id = ${masterProfileAId}`;
      expect(eduCount.c).toBe(0);

      const [expCount] = await sql`SELECT count(*)::int as c FROM public.experiences WHERE profile_id = ${masterProfileAId}`;
      expect(expCount.c).toBe(0);

      const [projCount] = await sql`SELECT count(*)::int as c FROM public.projects WHERE profile_id = ${masterProfileAId}`;
      expect(projCount.c).toBe(0);

      const [skillCount] = await sql`SELECT count(*)::int as c FROM public.skills WHERE profile_id = ${masterProfileAId}`;
      expect(skillCount.c).toBe(0);

      const [pubCount] = await sql`SELECT count(*)::int as c FROM public.publications WHERE profile_id = ${masterProfileAId}`;
      expect(pubCount.c).toBe(0);

      const [achCount] = await sql`SELECT count(*)::int as c FROM public.achievements WHERE profile_id = ${masterProfileAId}`;
      expect(achCount.c).toBe(0);

      const [certCount] = await sql`SELECT count(*)::int as c FROM public.certifications WHERE profile_id = ${masterProfileAId}`;
      expect(certCount.c).toBe(0);

      const [custCount] = await sql`SELECT count(*)::int as c FROM public.custom_sections WHERE profile_id = ${masterProfileAId}`;
      expect(custCount.c).toBe(0);

      const [docCount] = await sql`SELECT count(*)::int as c FROM public.documents WHERE user_id = ${userAId}`;
      expect(docCount.c).toBe(0);

      const [docSecCount] = await sql`SELECT count(*)::int as c FROM public.document_sections WHERE document_id = ${docAId}`;
      expect(docSecCount.c).toBe(0);

      const [webCount] = await sql`SELECT count(*)::int as c FROM public.websites WHERE user_id = ${userAId}`;
      expect(webCount.c).toBe(0);

      const [aiCount] = await sql`SELECT count(*)::int as c FROM public.ai_usage_logs WHERE user_id = ${userAId}`;
      expect(aiCount.c).toBe(0);

      // 5. Verify User B rows are completely untouched
      const [userBProfile] = await sql`SELECT count(*)::int as c FROM public.profiles WHERE id = ${userBId}`;
      expect(userBProfile.c).toBe(1);

      const [userBMaster] = await sql`SELECT count(*)::int as c FROM public.master_profiles WHERE user_id = ${userBId}`;
      expect(userBMaster.c).toBe(1);

      const [userBDoc] = await sql`SELECT count(*)::int as c FROM public.documents WHERE user_id = ${userBId}`;
      expect(userBDoc.c).toBe(1);

      // 6. Second call with old deleted session returns 401
      const secondDeleteRes = await fetch(`${BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: BASE_URL,
          Cookie: freshCookies,
        },
        body: JSON.stringify({ confirmEmail: emailA }),
      });
      expect(secondDeleteRes.status).toBe(401);
    });
  });
});
