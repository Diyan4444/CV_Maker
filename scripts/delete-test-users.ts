import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { users }, error } = await adminClient.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }

  const preserveEmail = process.env.PRIMARY_ADMIN_EMAIL || process.env.USER_ACCOUNT_EMAIL || '';

  for (const u of users) {
    if (u.email && (!preserveEmail || u.email !== preserveEmail) && (u.email.includes('test') || u.email.endsWith('.local') || u.email.includes('audit') || u.email.endsWith('@example.com'))) {
      console.log(`Deleting test user: ${u.email} (${u.id})`);
      await adminClient.auth.admin.deleteUser(u.id);
    }
  }

  const { data: { users: remaining } } = await adminClient.auth.admin.listUsers();
  console.log(`Remaining users count: ${remaining.length}`);
  remaining.forEach((u) => console.log(`- ${u.email} (${u.id})`));
}

main().catch(console.error);
