import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/apply-sql.ts <path-to-sql-file>');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), filePath);
  const sqlContent = fs.readFileSync(fullPath, 'utf-8');

  const { db } = await import('../src/lib/db');
  const { sql } = await import('drizzle-orm');

  console.log(`Applying SQL file: ${filePath}...`);
  await db.execute(sql.raw(sqlContent));
  console.log(`Successfully applied ${filePath}!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error applying SQL:', err);
  process.exit(1);
});
