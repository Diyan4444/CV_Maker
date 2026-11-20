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
    console.error('Failed to list users:', error);
    return;
  }

  console.log(`Total users in Supabase Auth: ${users.length}`);
  users.forEach((u, i) => {
    console.log(`[${i + 1}] ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
  });
}

main().catch(console.error);
