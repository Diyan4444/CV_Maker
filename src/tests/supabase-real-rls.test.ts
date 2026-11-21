/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { assertTestProjectRefAllowed } from '../lib/test-utils/production-guard';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = Boolean(
  supabaseUrl &&
  anonKey &&
  serviceKey &&
  !supabaseUrl.includes('placeholder')
);

describe.skipIf(!hasCredentials)('Real Supabase RLS & Two-User Integration Tests', { timeout: 60000 }, () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAClient: ReturnType<typeof createClient>;
  let userBClient: ReturnType<typeof createClient>;
  let anonClient: ReturnType<typeof createClient>;

  let userA: { id: string };
  let userB: { id: string };

  const emailA = `test-user-a-${Date.now()}@example.com`;
  const emailB = `test-user-b-${Date.now()}@example.com`;
  const password = 'TestSecurePassword123!';

  let masterProfileA: { id: string };
  let docA: { id: string };

  beforeAll(async () => {
    assertTestProjectRefAllowed(supabaseUrl);
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    anonClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create real User A
    const { data: dataA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'User A Real' },
    });
    if (errA) throw new Error(`Failed to create User A: ${errA.message}`);
    userA = dataA.user as { id: string };

    // 2. Create real User B
    const { data: dataB, error: errB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'User B Real' },
    });
    if (errB) throw new Error(`Failed to create User B: ${errB.message}`);
    userB = dataB.user as { id: string };

    // 3. Authenticate User A
    userAClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginErrA } = await userAClient.auth.signInWithPassword({
      email: emailA,
      password: password,
    });
    if (loginErrA) throw new Error(`Login User A failed: ${loginErrA.message}`);

    // 4. Authenticate User B
    userBClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginErrB } = await userBClient.auth.signInWithPassword({
      email: emailB,
      password: password,
    });
    if (loginErrB) throw new Error(`Login User B failed: ${loginErrB.message}`);

    // Create User A master profile, document, and website
    const { data: pA } = await (userAClient as any)
      .from('master_profiles')
      .insert({
        user_id: userA.id,
        background_group: 'Engineering & Technology',
        specialization: 'Computer Science Engineering',
        headline: 'User A Headline',
      })
      .select()
      .single();
    masterProfileA = pA as { id: string };

    const { data: dA } = await (userAClient as any)
      .from('documents')
      .insert({
        user_id: userA.id,
        title: 'User A Confidential Resume',
        type: 'resume',
        template_id: 'ats_single_column',
      })
      .select()
      .single();
    docA = dA as { id: string };

    await (userAClient as any)
      .from('websites')
      .insert({
        user_id: userA.id,
        username: `user-a-${Date.now()}`,
        is_published: false,
      });
  }, 30000);

  afterAll(async () => {
    // Cleanup: delete test users via admin API (cascades to all user rows)
    if (userA?.id) await adminClient.auth.admin.deleteUser(userA.id);
    if (userB?.id) await adminClient.auth.admin.deleteUser(userB.id);

    // Verify deletion
    const { data: list } = await adminClient.auth.admin.listUsers();
    const remaining = list?.users?.filter((u: { email?: string }) => u.email?.includes('test-user-'));
    if (remaining?.length) {
      for (const r of remaining) {
        await adminClient.auth.admin.deleteUser(r.id);
      }
    }
  }, 30000);

  it('Step 0(b): on_auth_user_created trigger automatically populated profiles row for User A', async () => {
    const { data, error } = await (adminClient as any)
      .from('profiles')
      .select('*')
      .eq('id', userA.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect((data as any)?.email).toBe(emailA);
    expect((data as any)?.full_name).toBe('User A Real');
  });

  // Table definitions covering ALL 14 tables with user data
  const privateChildTables = [
    { table: 'education', insert: () => ({ profile_id: masterProfileA.id, institution: 'A University', degree: 'B.Tech' }) },
    { table: 'experiences', insert: () => ({ profile_id: masterProfileA.id, type: 'job', organization: 'A Corp', role: 'Engineer' }) },
    { table: 'projects', insert: () => ({ profile_id: masterProfileA.id, title: 'Secret Project A' }) },
    { table: 'skills', insert: () => ({ profile_id: masterProfileA.id, category: 'Technical Skills' }) },
    { table: 'publications', insert: () => ({ profile_id: masterProfileA.id, title: 'Paper A' }) },
    { table: 'achievements', insert: () => ({ profile_id: masterProfileA.id, title: 'Award A' }) },
    { table: 'certifications', insert: () => ({ profile_id: masterProfileA.id, name: 'Cert A', issuer: 'Issuer A' }) },
    { table: 'custom_sections', insert: () => ({ profile_id: masterProfileA.id, section_title: 'Custom A' }) },
    { table: 'document_sections', insert: () => ({ document_id: docA.id, section_type: 'header', title: 'Header', content: {} }) },
  ];

  it(
    'Step 0(c): loops over ALL child tables — User A inserts, User B cannot SELECT, UPDATE, DELETE, or INSERT using User A ID',
    async () => {
      for (const item of privateChildTables) {
        // 1. User A inserts row
        const { data: insertedA, error: errInsertA } = await (userAClient as any)
          .from(item.table)
          .insert(item.insert())
          .select()
          .single();

        expect(errInsertA, `User A insert failed on ${item.table}`).toBeNull();
        expect(insertedA, `User A insert returned null on ${item.table}`).toBeDefined();

        const rowId = (insertedA as any)?.id;

        // 2. User B tries to SELECT User A's row
        const { data: bRead } = await (userBClient as any)
          .from(item.table)
          .select('*')
          .eq('id', rowId);
        expect(bRead, `User B should read 0 rows on ${item.table}`).toEqual([]);

        // 3. User B tries to UPDATE User A's row
        const { data: bUpdate } = await (userBClient as any)
          .from(item.table)
          .update({ ...(item.table === 'projects' ? { title: 'B Hack' } : {}) })
          .eq('id', rowId)
          .select();
        expect(bUpdate ?? [], `User B update should affect 0 rows on ${item.table}`).toEqual([]);

        // 4. User B tries to DELETE User A's row
        const { data: bDelete } = await (userBClient as any)
          .from(item.table)
          .delete()
          .eq('id', rowId)
          .select();
        expect(bDelete ?? [], `User B delete should affect 0 rows on ${item.table}`).toEqual([]);

        // 5. User B tries to INSERT with User A's profile_id or document_id (Forging foreign key)
        const { data: bForgeInsert } = await (userBClient as any)
          .from(item.table)
          .insert(item.insert())
          .select();

        expect(bForgeInsert === null || (Array.isArray(bForgeInsert) && bForgeInsert.length === 0)).toBe(true);
      }
    },
    20000
  );

  it('Covers profiles, master_profiles, documents, websites, and ai_usage_logs: User B cannot read or hijack User A data', async () => {
    // 1. User B tries to read User A's profile
    const { data: bProfile } = await (userBClient as any).from('profiles').select('*').eq('id', userA.id);
    expect(bProfile).toEqual([]);

    // 2. User B tries to update User A's profile
    const { data: bUpdateProf } = await (userBClient as any).from('profiles').update({ full_name: 'Hijacked' }).eq('id', userA.id).select();
    expect(bUpdateProf).toEqual([]);

    // 3. User B tries to read User A's website config
    const { data: bSite } = await (userBClient as any).from('websites').select('*').eq('user_id', userA.id);
    expect(bSite).toEqual([]);

    // 4. User B tries to hijack User A's website publish state or username
    const { data: bUpdateSite } = await (userBClient as any).from('websites').update({ is_published: true }).eq('user_id', userA.id).select();
    expect(bUpdateSite).toEqual([]);

    // 5. Authenticated users CANNOT insert into ai_usage_logs (privilege denied at database level)
    const { data: bAiInsert, error: aiErr } = await (userBClient as any).from('ai_usage_logs').insert({
      user_id: userB.id,
      action_type: 'hacked_action',
    }).select();
    expect(aiErr).toBeDefined();
    expect(aiErr?.code).toBe('42501'); // Permission denied for table ai_usage_logs
  });

  it('Database Constraints: Direct client attack with reserved username or invalid format is rejected by Postgres', async () => {
    // 1. Attack with reserved username 'admin'
    const { error: reservedErr } = await (userAClient as any)
      .from('websites')
      .update({ username: 'admin' })
      .eq('user_id', userA.id);

    expect(reservedErr).toBeDefined();
    // Check violation from trigger or check constraint (error code 23514)
    expect(reservedErr?.code).toBe('23514');

    // 2. Attack with invalid format (e.g. contains capital letters, starts with hyphen, or symbols)
    const { error: invalidFormatErr } = await (userAClient as any)
      .from('websites')
      .update({ username: '-invalid-name!' })
      .eq('user_id', userA.id);

    expect(invalidFormatErr).toBeDefined();
    expect(invalidFormatErr?.code).toBe('23514');

    // 3. Attack with oversized headline (> 300 characters: triggers 22001 string_data_right_truncation or 23514 check_violation)
    const oversizedHeadline = 'A'.repeat(301);
    const { error: headlineErr } = await (userAClient as any)
      .from('master_profiles')
      .update({ headline: oversizedHeadline })
      .eq('id', masterProfileA.id);

    expect(headlineErr).toBeDefined();
    expect(['22001', '23514']).toContain(headlineErr?.code);

    // 4. Attack with oversized summary (> 4000 characters)
    const oversizedSummary = 'B'.repeat(4001);
    const { error: summaryErr } = await (userAClient as any)
      .from('master_profiles')
      .update({ summary: oversizedSummary })
      .eq('id', masterProfileA.id);

    expect(summaryErr).toBeDefined();
    expect(['22001', '23514']).toContain(summaryErr?.code);

    // 5. Attack with oversized institution name (> 255 characters on child table)
    const oversizedInst = 'C'.repeat(256);
    const { error: eduInstErr } = await (userAClient as any)
      .from('education')
      .insert({
        profile_id: masterProfileA.id,
        institution: oversizedInst,
        degree: 'B.Tech',
      });
    expect(eduInstErr).toBeDefined();
    expect(['22001', '23514']).toContain(eduInstErr?.code);

    // 6. Attack with oversized array length (> 50 highlights in education)
    const oversizedHighlights = Array.from({ length: 51 }, (_, i) => `Highlight ${i + 1}`);
    const { error: highlightsErr } = await (userAClient as any)
      .from('education')
      .insert({
        profile_id: masterProfileA.id,
        institution: 'Valid Institute',
        degree: 'Valid Degree',
        highlights: oversizedHighlights,
      });
    expect(highlightsErr).toBeDefined();
    expect(highlightsErr?.code).toBe('23514');

    // 7. Attack with oversized document section content (> 65536 bytes payload)
    const largePayload = { hugeText: 'X'.repeat(70000) };
    const { error: largeDocErr } = await (userAClient as any)
      .from('document_sections')
      .insert({
        document_id: docA.id,
        section_type: 'custom',
        title: 'Huge Payload Section',
        content: largePayload,
      });
    expect(largeDocErr).toBeDefined();
    expect(largeDocErr?.code).toBe('23514');

    // 8. Attack with oversized contact_info (> 8192 octets) -> triggers 23514 check_violation
    const oversizedContactInfo = { address: 'Z'.repeat(8500) };
    const { error: contactInfoErr } = await (userAClient as any)
      .from('master_profiles')
      .update({ contact_info: oversizedContactInfo })
      .eq('id', masterProfileA.id);
    expect(contactInfoErr).toBeDefined();
    expect(contactInfoErr?.code).toBe('23514');

    // 9. Attack with oversized social_links (> 8192 octets) -> triggers 23514 check_violation
    const oversizedSocialLinks = { customLink: 'Y'.repeat(8500) };
    const { error: socialLinksErr } = await (userAClient as any)
      .from('master_profiles')
      .update({ social_links: oversizedSocialLinks })
      .eq('id', masterProfileA.id);
    expect(socialLinksErr).toBeDefined();
    expect(socialLinksErr?.code).toBe('23514');

    // 10. Attack with oversized websites custom_headline (> 300 chars) -> triggers 23514 check_violation
    const oversizedWebHeadline = 'W'.repeat(301);
    const { error: webHeadlineErr } = await (userAClient as any)
      .from('websites')
      .update({ custom_headline: oversizedWebHeadline })
      .eq('user_id', userA.id);
    expect(webHeadlineErr).toBeDefined();
    expect(['22001', '23514']).toContain(webHeadlineErr?.code);

    // 11. Attack with oversized websites custom_bio (> 4000 chars) -> triggers 23514 check_violation
    const oversizedWebBio = 'V'.repeat(4001);
    const { error: webBioErr } = await (userAClient as any)
      .from('websites')
      .update({ custom_bio: oversizedWebBio })
      .eq('user_id', userA.id);
    expect(webBioErr).toBeDefined();
    expect(webBioErr?.code).toBe('23514');

    // 12. Attack with oversized websites field_visibility (> 16384 octets) -> triggers 23514 check_violation
    const oversizedVisibility = { customRules: 'U'.repeat(17000) };
    const { error: visibilityErr } = await (userAClient as any)
      .from('websites')
      .update({ field_visibility: oversizedVisibility })
      .eq('user_id', userA.id);
    expect(visibilityErr).toBeDefined();
    expect(visibilityErr?.code).toBe('23514');
  });

  it('Database Row Caps: Triggers enforce per-user document and child table row limits', async () => {
    // Clean up any existing custom_sections from earlier tests
    await (userAClient as any)
      .from('custom_sections')
      .delete()
      .eq('profile_id', masterProfileA.id);

    // Test child table cap on custom_sections (cap is 20 rows per profile)
    // 1. Insert exactly 20 custom sections
    const bulkCustoms = Array.from({ length: 20 }, (_, i) => ({
      profile_id: masterProfileA.id,
      section_title: `Custom Section ${i + 1}`,
      entries: [],
      order_index: i,
    }));

    const { error: bulkErr } = await (userAClient as any)
      .from('custom_sections')
      .insert(bulkCustoms);
    expect(bulkErr).toBeNull();

    // 2. 21st insert MUST be rejected by tr_check_cap_custom_sections with 23514 check_violation
    const { error: capExceededErr } = await (userAClient as any)
      .from('custom_sections')
      .insert({
        profile_id: masterProfileA.id,
        section_title: 'Exceeding Section 21',
        entries: [],
        order_index: 21,
      });

    expect(capExceededErr).toBeDefined();
    expect(capExceededErr?.code).toBe('23514');
    expect(capExceededErr?.message).toContain('Row cap exceeded for custom_sections');

    // Clean up inserted test rows
    await (userAClient as any)
      .from('custom_sections')
      .delete()
      .eq('profile_id', masterProfileA.id);
  });

  it('Step 0(d) & Fix 5: Unauthenticated anonymous client CANNOT read any private tables (anon role completely blocked)', async () => {
    const allPrivateTables = [
      'profiles',
      'master_profiles',
      'education',
      'experiences',
      'projects',
      'skills',
      'publications',
      'achievements',
      'certifications',
      'custom_sections',
      'documents',
      'document_sections',
      'websites',
      'ai_usage_logs',
    ];

    for (const tbl of allPrivateTables) {
      const { data } = await anonClient.from(tbl).select('*');
      expect(data === null || (Array.isArray(data) && data.length === 0), `Anon should not read ${tbl}`).toBe(true);
    }
  }, 30000);
});
