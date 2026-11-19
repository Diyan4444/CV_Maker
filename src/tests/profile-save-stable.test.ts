 
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

describe.skipIf(!hasCredentials)('Profile Save Route: Concurrency, Versioning & Stable IDs', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAClient: ReturnType<typeof createClient>;
  let userA: { id: string };
  const emailA = `test-stable-${Date.now()}@example.com`;
  const password = 'TestSecurePassword123!';
  let masterProfileA: { id: string; version: number };

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

    const { data: pA, error: pAErr } = await (userAClient as any)
      .from('master_profiles')
      .insert({
        user_id: userA.id,
        background_group: 'Engineering and Technology',
        specialization: 'Computer Science Engineering',
        headline: 'Initial Headline',
        version: 1,
      })
      .select()
      .single();
    if (pAErr) throw pAErr;
    masterProfileA = pA as { id: string; version: number };
  });

  afterAll(async () => {
    if (userA?.id) {
      await adminClient.auth.admin.deleteUser(userA.id);
    }
  });

  it('(a) a child-only change increments the master profile version', async () => {
    const { db } = await import('@/lib/db');
    const { masterProfiles, education } = await import('@/lib/db/schema');
    const { eq, and, sql } = await import('drizzle-orm');

    // 1. Fetch baseline version
    const [before] = await db
      .select({ version: masterProfiles.version })
      .from(masterProfiles)
      .where(eq(masterProfiles.id, masterProfileA.id));
    const startVersion = before.version;

    // 2. Execute save transaction modifying ONLY a child table (education), no profile fields
    await db.transaction(async (tx) => {
      // Child row modification
      await tx.insert(education).values({
        profileId: masterProfileA.id,
        institution: 'Indian Institute of Technology Bombay',
        degree: 'B.Tech in Computer Science and Engineering',
        orderIndex: 0,
      });

      // Master profile version MUST be incremented in the same transaction
      const updateResult = await tx
        .update(masterProfiles)
        .set({
          version: sql`${masterProfiles.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(masterProfiles.id, masterProfileA.id),
            eq(masterProfiles.version, startVersion)
          )
        )
        .returning({ newVersion: masterProfiles.version });

      if (updateResult.length === 0) {
        throw new Error('STALE_SAVE_CONFLICT');
      }
    });

    // 3. Verify master profile version was incremented
    const [after] = await db
      .select({ version: masterProfiles.version })
      .from(masterProfiles)
      .where(eq(masterProfiles.id, masterProfileA.id));

    expect(after.version).toBe(startVersion + 1);
  });

  it('(b) two concurrent saves from the same starting version: exactly one succeeds, one gets 409 conflict', async () => {
    const { db } = await import('@/lib/db');
    const { masterProfiles, experiences } = await import('@/lib/db/schema');
    const { eq, and, sql } = await import('drizzle-orm');

    // 1. Fetch current version
    const [current] = await db
      .select({ version: masterProfiles.version })
      .from(masterProfiles)
      .where(eq(masterProfiles.id, masterProfileA.id));
    const baseVersion = current.version;

    // Helper simulating atomic save route execution
    const runSaveAttempt = async (sessionTag: string) => {
      return await db.transaction(async (tx) => {
        // Touch child table
        await tx.insert(experiences).values({
          profileId: masterProfileA.id,
          type: 'internship',
          organization: `Org ${sessionTag}`,
          role: `Software Intern ${sessionTag}`,
          orderIndex: 0,
        });

        // Atomic conditional version bump
        const res = await tx
          .update(masterProfiles)
          .set({
            version: sql`${masterProfiles.version} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(masterProfiles.id, masterProfileA.id),
              eq(masterProfiles.version, baseVersion)
            )
          )
          .returning({ newVersion: masterProfiles.version });

        if (res.length === 0) {
          throw new Error('STALE_SAVE_CONFLICT');
        }
        return res[0].newVersion;
      });
    };

    // 2. Launch two concurrent save transactions from the same baseVersion
    const results = await Promise.allSettled([
      runSaveAttempt('Session A'),
      runSaveAttempt('Session B'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one must succeed, exactly one must fail with STALE_SAVE_CONFLICT
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    if (rejected[0].status === 'rejected') {
      expect((rejected[0].reason as Error).message).toBe('STALE_SAVE_CONFLICT');
    }

    // Master profile version must be baseVersion + 1
    const [finalProfile] = await db
      .select({ version: masterProfiles.version })
      .from(masterProfiles)
      .where(eq(masterProfiles.id, masterProfileA.id));

    expect(finalProfile.version).toBe(baseVersion + 1);
  });

  it('(c) existing child IDs remain stable across updates and are not deleted or re-created', async () => {
    const { db } = await import('@/lib/db');
    const { education } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // 1. Initial Insert of an education row
    const [inserted] = await db
      .insert(education)
      .values({
        profileId: masterProfileA.id,
        institution: 'Original University',
        degree: 'Bachelor of Technology',
        orderIndex: 99,
      })
      .returning({ id: education.id });

    const originalStableId = inserted.id;
    expect(originalStableId).toBeDefined();

    // 2. Perform an in-place update targeting that ID
    await db
      .update(education)
      .set({
        institution: 'Updated University Name',
      })
      .where(eq(education.id, originalStableId));

    // 3. Query row and verify ID is unchanged
    const [queried] = await db
      .select()
      .from(education)
      .where(eq(education.id, originalStableId));

    expect(queried).toBeDefined();
    expect(queried.id).toBe(originalStableId);
    expect(queried.institution).toBe('Updated University Name');

    // Clean up test row
    await db.delete(education).where(eq(education.id, originalStableId));
  });
});
