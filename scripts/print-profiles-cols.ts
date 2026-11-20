import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const cols = await sql`
    SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name IN ('profiles', 'master_profiles', 'document_sections')
    ORDER BY table_name, ordinal_position;
  `;
  for (const c of cols) {
    console.log(`${c.table_name}.${c.column_name} | ${c.data_type} | max_len: ${c.character_maximum_length}`);
  }
  await sql.end();
}
run();
