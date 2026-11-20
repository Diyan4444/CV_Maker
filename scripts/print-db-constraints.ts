import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT relname as table_name, conname, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public' AND c.contype = 'c'
    ORDER BY relname, conname;
  `;
  for (const r of rows) {
    console.log(`${r.table_name} | ${r.conname} | ${r.def}`);
  }
  await sql.end();
}
run();
