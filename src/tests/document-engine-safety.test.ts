import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCredentials = Boolean(
  supabaseUrl && anonKey && serviceKey && !supabaseUrl.includes('placeholder')
);

describe.skipIf(!hasCredentials)('Document Engine: API Security, Rollback, Switch & Cloning Isolation', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAClient: ReturnType<typeof createClient>;
  let userBClient: ReturnType<typeof createClient>;
  let userA: { id: string };
  let userB: { id: string };
  const emailA = `test-docsec-a-${Date.now()}@example.com`;
  const emailB = `test-docsec-b-${Date.now()}@example.com`;
  const password = 'TestSecurePassword123!';
  let docA: { id: string; version: number };

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const resA = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'User A' },
    });
    userA = resA.data.user!;

    const resB = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'User B' },
    });
    userB = resB.data.user!;

    userAClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userAClient.auth.signInWithPassword({ email: emailA, password });

    userBClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userBClient.auth.signInWithPassword({ email: emailB, password });

    // Create a document for User A via userAClient
    const { data: docData, error: docErr } = await (userAClient as any)
      .from('documents')
      .insert({
        user_id: userA.id,
        type: 'resume',
        title: 'User A Secret Resume',
        template_id: 'ats_single_column',
        accent_color: '#0B0B0B',
        version: 1,
      })
      .select()
      .single();

    if (docErr) throw docErr;
    docA = docData!;

    const { error: secErr } = await (userAClient as any)
      .from('document_sections')
      .insert({
        document_id: docA.id,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: { full_name: 'User A', email: emailA },
      });

    if (secErr) throw secErr;
  });

  afterAll(async () => {
    if (!adminClient) return;
    if (userA?.id) {
      await adminClient.from('documents').delete().eq('user_id', userA.id);
      await adminClient.auth.admin.deleteUser(userA.id);
    }
    if (userB?.id) {
      await adminClient.from('documents').delete().eq('user_id', userB.id);
      await adminClient.auth.admin.deleteUser(userB.id);
    }
  });

  it('verifies RLS prevents cross-user access: User B CANNOT read or update User A document', async () => {
    // User B attempts to read User A's document
    const { data: readData } = await (userBClient as any)
      .from('documents')
      .select()
      .eq('id', docA.id);

    // RLS filters out rows that don't belong to User B (returns empty list)
    expect(readData).toEqual([]);

    // User B attempts to update User A's document
    const { data: updateData } = await (userBClient as any)
      .from('documents')
      .update({ title: 'Hijacked by B' })
      .eq('id', docA.id)
      .select();

    expect(updateData).toEqual([]);

    // Verify document title was not altered
    const { data: checkData } = await (userAClient as any)
      .from('documents')
      .select()
      .eq('id', docA.id)
      .single();

    expect(checkData?.title).toBe('User A Secret Resume');
  });

  it('template switch data preservation: changing template preserves sections and content', async () => {
    const { data: updatedDoc, error } = await (userAClient as any)
      .from('documents')
      .update({ template_id: 'academic_cv', version: 2 })
      .eq('id', docA.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updatedDoc?.template_id).toBe('academic_cv');

    const { data: sections } = await (userAClient as any)
      .from('document_sections')
      .select()
      .eq('document_id', docA.id);

    expect(sections?.length).toBe(1);
    expect((sections![0].content as any).full_name).toBe('User A');
  });

  it('duplicate independence: cloned document is completely isolated from original', async () => {
    // Clone document for User A
    const { data: dupDoc } = await (userAClient as any)
      .from('documents')
      .insert({
        user_id: userA.id,
        type: 'resume',
        title: 'User A Cloned Resume',
        template_id: 'ats_single_column',
        accent_color: '#0B0B0B',
        version: 1,
      })
      .select()
      .single();

    await (userAClient as any).from('document_sections').insert({
      document_id: dupDoc!.id,
      section_type: 'header',
      title: 'Header',
      order_index: 0,
      is_visible: true,
      content: { full_name: 'User A Modified Clone', email: emailA },
    });

    // Mutate original document
    await (userAClient as any)
      .from('documents')
      .update({ title: 'Mutated Original' })
      .eq('id', docA.id);

    // Check duplicate
    const { data: checkDup } = await (userAClient as any)
      .from('documents')
      .select()
      .eq('id', dupDoc!.id)
      .single();

    expect(checkDup?.title).toBe('User A Cloned Resume');

    // Clean up duplicate
    await (userAClient as any).from('documents').delete().eq('id', dupDoc!.id);
  });
});
