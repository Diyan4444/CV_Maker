import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { SectionContentSchemaMap } from '../lib/documents/schemas';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Item 2: Save Error Root Cause & Field Invariant Tests', () => {
  let testUserId: string;
  let testProfileId: string;

  beforeAll(async () => {
    const { data: users } = await supabase.auth.admin.listUsers();
    testUserId = users?.users?.find(u => u.email === 'diyanshah2301@gmail.com')?.id || users?.users?.[0]?.id || '';
    const { data: mp } = await supabase.from('master_profiles').select('id').eq('user_id', testUserId).single();
    testProfileId = mp?.id || '';
    if (!testProfileId) {
      // Create master profile if absent
      const { data: newMp } = await supabase.from('master_profiles').insert({
        user_id: testUserId,
        headline: 'Test Profile',
      }).select('id').single();
      testProfileId = newMp?.id || '';
    }
  });

  it('reproduces exact original error: empty issuingOrg failed with "Issuing Organization is required"', () => {
    // Original Zod schema from commit 7c50059
    const originalCertEntrySchema = z.object({
      id: z.string().uuid(),
      name: z.string().min(1, 'Name is required').max(255),
      issuingOrg: z.string().min(1, 'Issuing Organization is required').max(200),
    });

    const payload = {
      id: 'dfcb4828-39c2-4cc0-bd96-0a1ca1446c0a',
      name: 'owejjn',
      issuingOrg: '', // User did not fill issuer
    };

    const result = originalCertEntrySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      expect(formatted).toBe('issuingOrg: Issuing Organization is required');
    }
  });

  it('reproduces exact original error: name > 255 chars failed with "Too big"', () => {
    // Original Zod schema from commit 7c50059
    const originalCertEntrySchema = z.object({
      id: z.string().uuid(),
      name: z.string().min(1, 'Name is required').max(255),
      issuingOrg: z.string().min(1, 'Issuing Organization is required').max(200),
    });

    const payload = {
      id: 'dfcb4828-39c2-4cc0-bd96-0a1ca1446c0a',
      name: 'a'.repeat(256), // > 255 chars
      issuingOrg: '', // empty
    };

    const result = originalCertEntrySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      expect(messages.some(m => m.includes('entries.0.name: Too big') || m.includes('name:'))).toBe(true);
      expect(messages.some(m => m.includes('issuingOrg: Issuing Organization is required'))).toBe(true);
    }
  });

  it('verifies updated schema accepts empty issuingOrg and empty fields without validation error', () => {
    const payload = {
      schema_version: '1.0.0',
      entries: [
        {
          id: 'dfcb4828-39c2-4cc0-bd96-0a1ca1446c0a',
          name: 'owejjn',
          issuingOrg: '', // optional
        }
      ]
    };

    const result = SectionContentSchemaMap.certifications.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('verifies DB constraint invariant: 255 chars in certifications.name succeeds in DB', async () => {
    const name255 = 'x'.repeat(255);
    const { data, error } = await supabase.from('certifications').insert({
      profile_id: testProfileId,
      name: name255,
      issuer: 'Test Issuer',
    }).select();

    expect(error).toBeNull();
    expect(data?.[0]?.name).toBe(name255);

    // Clean up
    if (data?.[0]?.id) {
      await supabase.from('certifications').delete().eq('id', data[0].id);
    }
  });

  it('verifies DB constraint invariant: 256 chars (max+1) in certifications.name is rejected by DB with value too long', async () => {
    const name256 = 'x'.repeat(256);
    const { error } = await supabase.from('certifications').insert({
      profile_id: testProfileId,
      name: name256,
      issuer: 'Test Issuer',
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('value too long for type character varying(255)');
  });
});
