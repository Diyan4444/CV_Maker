import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await sb.auth.admin.listUsers();
  if (error) throw error;

  const preserveEmail = process.env.PRIMARY_ADMIN_EMAIL || process.env.USER_ACCOUNT_EMAIL || '';

  for (const u of data.users) {
    if (u.email && (!preserveEmail || u.email !== preserveEmail) && (u.email.includes('test') || u.email.endsWith('.local') || u.email.includes('audit') || u.email.endsWith('@example.com'))) {
      console.log(`Deleting test user: ${u.id} (${u.email})...`);
      await sb.auth.admin.deleteUser(u.id);
    }
  }

  const { data: remaining } = await sb.auth.admin.listUsers();
  console.log('Remaining users in Supabase Auth:');
  for (const u of remaining.users) {
    console.log(`- ID: ${u.id} | Email: ${u.email}`);
  }
}

main().catch(console.error);
