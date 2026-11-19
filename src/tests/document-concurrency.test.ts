 
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

describe.skipIf(!hasCredentials)('Document Engine: Concurrency, Versioning & Stable IDs', () => {
  let adminClient: ReturnType<typeof createClient>;
  let userAClient: ReturnType<typeof createClient>;
  let userA: { id: string };
  const emailA = `test-doc-concurrency-${Date.now()}@example.com`;
  const password = 'TestSecurePassword123!';
  let documentA: { id: string; version: number };
  let headerSectionId: string;

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: dataA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Document Concurrency Test User' },
    });
    if (errA) throw new Error(`Failed to create User A: ${errA.message}`);
    userA = dataA.user as { id: string };

    userAClient = createClient(supabaseUrl!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await userAClient.auth.signInWithPassword({ email: emailA, password });

    // Insert initial document
    const { data: doc, error: docErr } = await (userAClient as any)
      .from('documents')
      .insert({
        user_id: userA.id,
        type: 'resume',
        title: 'Initial Document Title',
        template_id: 'ats_single_column',
        version: 1,
      })
      .select()
      .single();
    if (docErr) throw docErr;
    documentA = doc as { id: string; version: number };

    // Insert initial section
    const { data: sec, error: secErr } = await (userAClient as any)
      .from('document_sections')
      .insert({
        document_id: documentA.id,
        section_type: 'header',
        title: 'Header',
        order_index: 0,
        is_visible: true,
        content: {
          full_name: 'Document Concurrency User',
          email: emailA,
          phone: '1234567890',
          location: 'Remote',
          links: [],
        },
      })
      .select()
      .single();
    if (secErr) throw secErr;
    headerSectionId = sec.id;
  });

  afterAll(async () => {
    if (adminClient && userA?.id) {
      await adminClient.auth.admin.deleteUser(userA.id);
    }
  });

  it('increments version on successful document save', async () => {
    const startingVersion = documentA.version; // 1

    // Simulate save by updating document and incrementing version
    const { data: updatedDoc, error: updateErr } = await (userAClient as any)
      .from('documents')
      .update({
        title: 'Updated Document Title V2',
        version: startingVersion + 1,
      })
      .eq('id', documentA.id)
      .eq('version', startingVersion)
      .select()
      .single();

    expect(updateErr).toBeNull();
    expect(updatedDoc.version).toBe(startingVersion + 1);
    expect(updatedDoc.title).toBe('Updated Document Title V2');

    documentA.version = updatedDoc.version;
  });

  it('detects stale version conflict when client sends outdated version', async () => {
    const staleVersion = documentA.version - 1; // 1 while server is at 2

    // Attempt conditional update with stale version
    const { data: staleResult, error } = await (userAClient as any)
      .from('documents')
      .update({
        title: 'Conflicting Stale Edit',
        version: staleVersion + 1,
      })
      .eq('id', documentA.id)
      .eq('version', staleVersion)
      .select();

    expect(error).toBeNull();
    // No rows updated due to version mismatch condition
    expect(staleResult.length).toBe(0);

    // Verify server document remains at version 2 with original title
    const { data: currentServerDoc } = await (userAClient as any)
      .from('documents')
      .select('*')
      .eq('id', documentA.id)
      .single();

    expect(currentServerDoc.version).toBe(documentA.version);
    expect(currentServerDoc.title).toBe('Updated Document Title V2');
  });

  it('preserves section stable ID across updates', async () => {
    // Update existing section content
    const { data: updatedSec, error } = await (userAClient as any)
      .from('document_sections')
      .update({
        content: {
          full_name: 'Document Concurrency User Updated',
          email: emailA,
          phone: '9999999999',
          location: 'San Francisco, CA',
          links: [],
        },
      })
      .eq('id', headerSectionId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updatedSec.id).toBe(headerSectionId); // Stable ID unchanged
    expect(updatedSec.content.full_name).toBe('Document Concurrency User Updated');
  });
});
