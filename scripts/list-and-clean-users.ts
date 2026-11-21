import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }

  console.log(`Initial total users: ${data.users.length}`);
  const primaryEmail = process.env.PRIMARY_ADMIN_EMAIL || process.env.USER_ACCOUNT_EMAIL || '';

  for (const u of data.users) {
    console.log(`- ${u.id} | ${u.email} (created: ${u.created_at})`);
    const isTestUser = u.email && (
      u.email.includes('test') ||
      u.email.includes('audit') ||
      u.email.endsWith('.local') ||
      u.email.endsWith('@example.com')
    );
    const shouldDelete = isTestUser && (!primaryEmail || u.email !== primaryEmail);
    if (shouldDelete) {
      console.log(`  Deleting temporary test user: ${u.email}`);
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`  Failed to delete ${u.email}:`, delErr);
      } else {
        console.log(`  Successfully deleted ${u.email}`);
      }
    }
  }

  const { data: finalData } = await supabase.auth.admin.listUsers();
  console.log(`\nFinal total users after cleanup: ${finalData.users.length}`);
  for (const u of finalData.users) {
    console.log(`- ${u.id} | ${u.email}`);
  }
}

main();
