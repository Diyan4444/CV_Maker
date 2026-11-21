import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const names = [
    'master_profiles_contact_info_len_check',
    'master_profiles_social_links_len_check',
    'websites_custom_headline_len_check',
    'websites_custom_bio_len_check',
    'websites_field_visibility_len_check',
  ];
  const rows = await sql`
    SELECT c.conname, r.relname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    WHERE c.conname = ANY(${names})
    ORDER BY c.conname;
  `;
  console.log('Count found:', rows.length);
  for (const r of rows) {
    console.log(`${r.relname} | ${r.conname} | ${r.def}`);
  }
  await sql.end();
}
run();
