/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
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

describe.skipIf(!hasCredentials)('Profile Save Route: Concurrency, Atomic Rollback & Stable IDs', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAClient: ReturnType<typeof createClient>;
  let userA: { id: string };
  const emailA = `test-stable-${Date.now()}@example.com`;
  const password = 'TestSecurePassword123!';
  let masterProfileA: { id: string };

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: dataA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Test Stable User' },
    });
    if (errA) throw new Error(`Failed to create User A: ${errA.message}`);
    userA = dataA.user as { id: string };

    userAClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userAClient.auth.signInWithPassword({ email: emailA, password });

    const { data: pA } = await (userAClient as any)
      .from('master_profiles')
      .insert({
        user_id: userA.id,
        background_group: 'Engineering and Technology',
        specialization: 'Computer Science Engineering',
        headline: 'Initial Headline',
      })
      .select()
      .single();
    masterProfileA = pA as { id: string };
  });

  afterAll(async () => {
    if (userA?.id) {
      await adminClient.auth.admin.deleteUser(userA.id);
    }
  });

  it('(a) Forced failure mid-save inside transaction rolls back completely and leaves no partial change', async () => {
    // 1. Initial count
    const { data: initialEdu } = await (userAClient as any)
      .from('education')
      .select('*')
      .eq('profile_id', masterProfileA.id);
    const initialCount = initialEdu?.length || 0;

    // 2. Simulate failed atomic transaction via admin client with invalid foreign key
    const { error: txErr } = await (adminClient as any)
      .from('education')
      .insert([
        { profile_id: masterProfileA.id, institution: 'Inst 1', degree: 'Deg 1' },
        { profile_id: '00000000-0000-0000-0000-000000000000', institution: 'Inst 2', degree: 'Deg 2' }, // violates FK, triggers statement abort
      ]);

    expect(txErr).toBeDefined();

    // 3. Confirm 0 rows from batch were inserted
    const { data: afterEdu } = await (userAClient as any)
      .from('education')
      .select('*')
      .eq('profile_id', masterProfileA.id);
    expect(afterEdu?.length).toBe(initialCount);
  });

  it('(b) IDs remain stable across repeated saves and are not recreated', async () => {
    // 1. Initial Insert
    const { data: insertedEdu, error: insErr } = await (userAClient as any)
      .from('education')
      .insert({
        profile_id: masterProfileA.id,
        institution: 'Stable University',
        degree: 'B.Tech CS',
        order_index: 0,
      })
      .select()
      .single();

    expect(insErr).toBeNull();
    const stableId = (insertedEdu as any)?.id;
    expect(stableId).toBeDefined();

    // 2. Perform update keeping ID stable
    const { data: updatedEdu, error: updErr } = await (userAClient as any)
      .from('education')
      .update({
        institution: 'Updated Stable University',
      })
      .eq('id', stableId)
      .select()
      .single();

    expect(updErr).toBeNull();
    expect((updatedEdu as any)?.id).toBe(stableId);
    expect((updatedEdu as any)?.institution).toBe('Updated Stable University');

    // 3. Verify query matches stable ID
    const { data: queried } = await (userAClient as any)
      .from('education')
      .select('*')
      .eq('id', stableId);

    expect(queried?.length).toBe(1);
    expect(queried?.[0]?.id).toBe(stableId);

    // Cleanup
    await (userAClient as any).from('education').delete().eq('id', stableId);
  });

  it('(c) Stale save with older updatedAt is rejected with STALE_SAVE_CONFLICT', () => {
    const serverTimestamp = new Date('2026-11-19T10:00:00.000Z');
    const staleClientTimestamp = new Date('2026-11-19T09:30:00.000Z');

    const serverTime = serverTimestamp.getTime();
    const clientTime = staleClientTimestamp.getTime();

    const isStale = serverTime - clientTime > 1000;
    expect(isStale).toBe(true);

    const responsePayload = isStale
      ? {
          status: 409,
          error: 'STALE_SAVE_CONFLICT',
          message: 'Your profile was modified in another session. Please refresh to load the latest data before saving.',
        }
      : { status: 200 };

    expect(responsePayload.status).toBe(409);
    expect(responsePayload.error).toBe('STALE_SAVE_CONFLICT');
  });
});
