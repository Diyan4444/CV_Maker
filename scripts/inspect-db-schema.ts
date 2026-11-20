import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL missing');
    return;
  }

  // If db.* fails on IPv6, we can check pooler URL or direct
  console.log('Connecting to DB...');
  try {
    const sql = postgres(connectionString, { max: 1, connect_timeout: 10 });
    const cols = await sql`
      SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    console.log('\n--- COLUMNS ---');
    console.table(cols);

    const constraints = await sql`
      SELECT conname, relname as table_name, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'public' AND c.contype = 'c';
    `;
    console.log('\n--- CHECK CONSTRAINTS ---');
    console.table(constraints);

    await sql.end();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

main();
