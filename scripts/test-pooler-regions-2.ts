import { Client } from 'pg';

const regions = [
  'ap-south-1',
  'eu-central-2',
  'me-central-1',
  'af-south-1'
];

async function tryRegion(region: string) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  for (const port of [6543, 5432]) {
    const client = new Client({
      host,
      port,
      database: 'postgres',
      user: 'postgres.eidfwvezvzpvcgqnijhm',
      password: 'LaPolla2026',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`SUCCESS for region ${region} on port ${port}!`);
      await client.end();
      return true;
    } catch (err: any) {
      console.log(`Failed for region ${region} on port ${port}: ${err.message}`);
    }
  }
  return false;
}

async function run() {
  console.log('Testing additional regions...');
  for (const region of regions) {
    await tryRegion(region);
  }
}

run();
