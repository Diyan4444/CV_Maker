import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required to clean up auth users');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('=== Checking Supabase Auth Users ===');
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error('Failed to list users:', error);
    process.exit(1);
  }

  const allUsers = data.users || [];
  console.log(`Total users in Supabase Auth: ${allUsers.length}`);

  const testUsers = allUsers.filter(
    (u) =>
      u.email?.includes('test-') ||
      u.email?.includes('overflow-test') ||
      u.email?.includes('realpage-test') ||
      u.email?.includes('e2e-') ||
      u.email?.includes('@quillfolio.local') ||
      u.email?.includes('preview-') ||
      u.email?.includes('bench-')
  );

  console.log(`Found ${testUsers.length} test users to delete.`);

  for (const u of testUsers) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
    if (delErr) {
      console.error(`Failed to delete user ${u.email} (${u.id}):`, delErr);
    } else {
      console.log(`Deleted user: ${u.email} (${u.id})`);
    }
  }

  const { data: afterData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  console.log(`Remaining users in Supabase Auth after cleanup: ${afterData?.users?.length || 0}`);
  afterData?.users?.forEach((u) => console.log(` - ${u.email} (${u.id})`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
