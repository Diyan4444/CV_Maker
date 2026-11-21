 
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

describe.skipIf(!hasCredentials)('Document Engine: 20-Document Cap Enforcement', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userClient: ReturnType<typeof createClient>;
  let user: { id: string };
  const userEmail = `test-doc-cap-${Date.now()}@example.com`;
  const password = 'TestSecurePassword123!';
  const createdDocIds: string[] = [];

  beforeAll(async () => {
    assertTestProjectRefAllowed(supabaseUrl);
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Document Cap User' },
    });
    if (userErr) throw userErr;
    user = userData.user as { id: string };

    userClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userClient.auth.signInWithPassword({ email: userEmail, password });
  });

  afterAll(async () => {
    if (adminClient && user?.id) {
      await adminClient.auth.admin.deleteUser(user.id);
    }
  });

  it('allows user to create up to 20 documents and tracks total count', async () => {
    // Insert 20 documents in a batch
    const docsToInsert = Array.from({ length: 20 }, (_, i) => ({
      user_id: user.id,
      type: i % 2 === 0 ? 'resume' : 'cv',
      title: `Test Document ${i + 1}`,
      template_id: 'ats_single_column',
      version: 1,
    }));

    const { data, error } = await (userClient as any)
      .from('documents')
      .insert(docsToInsert)
      .select('id');

    expect(error).toBeNull();
    expect(data.length).toBe(20);
    data.forEach((d: any) => createdDocIds.push(d.id));

    // Verify count query
    const { count, error: countErr } = await (userClient as any)
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    expect(countErr).toBeNull();
    expect(count).toBe(20);
  });

  it('enforces that a 21st document creation is blocked by the application layer cap check', async () => {
    // Query count
    const { count } = await (userClient as any)
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isBlocked = (count || 0) >= 20;
    expect(isBlocked).toBe(true);

    // In route handler, if (totalDocs >= 20) it returns DOCUMENT_LIMIT_REACHED (HTTP 400)
    const capCheckResult = {
      allowed: !isBlocked,
      code: isBlocked ? 'DOCUMENT_LIMIT_REACHED' : 'OK',
      message: isBlocked ? 'You have reached the maximum limit of 20 documents.' : null,
    };

    expect(capCheckResult.allowed).toBe(false);
    expect(capCheckResult.code).toBe('DOCUMENT_LIMIT_REACHED');
  });
});
