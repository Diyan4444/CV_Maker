import postgres from 'postgres';

async function testRegion(host) {
  const sql = postgres({
    host,
    port: 6543,
    database: 'postgres',
    username: 'postgres.gluuewqktdvbjqaqykqv',
    password: 'diyan.shah@india',
    connect_timeout: 4,
    ssl: 'require'
  });
  try {
    const res = await sql`SELECT 1 as connected`;
    console.log('SUCCESS on', host, res);
    return true;
  } catch (e) {
    console.log('Failed on', host, e.message);
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function run() {
  const regions = [
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-eu-central-1.pooler.supabase.com',
  ];
  for (const r of regions) {
    if (await testRegion(r)) break;
  }
}

run();
