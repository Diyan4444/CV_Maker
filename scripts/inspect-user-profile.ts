import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Failed to list users:', userError);
    process.exit(1);
  }

  console.log(`=== SUPABASE AUTH USERS (${users.users.length}) ===`);
  for (const user of users.users) {
    console.log(`User ID: ${user.id} | Email: ${user.email} | Created: ${user.created_at}`);
    
    // Master Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    console.log(`  Profile Record:`, profile);

    // Profile Sections
    const { data: exp } = await supabase.from('profile_experiences').select('id, organization, role').eq('user_id', user.id);
    const { data: edu } = await supabase.from('profile_education').select('id, institution, degree').eq('user_id', user.id);
    const { data: certs } = await supabase.from('profile_certifications').select('id, name, issuing_org').eq('user_id', user.id);
    console.log(`  Profile Entries Count: Experiences=${exp?.length || 0}, Education=${edu?.length || 0}, Certs=${certs?.length || 0}`);

    // Documents
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, version, updated_at')
      .eq('user_id', user.id);
    console.log(`  Documents (${docs?.length || 0}):`);
    for (const d of (docs || [])) {
      const { data: header } = await supabase
        .from('document_sections')
        .select('content')
        .eq('document_id', d.id)
        .eq('section_type', 'header')
        .single();
      console.log(`    - [${d.id}] "${d.title}" (v${d.version}) | Header fullName: "${header?.content?.fullName ?? ''}"`);
    }
  }
}

main().catch(console.error);
