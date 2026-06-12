import { Client } from 'pg';

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'sa-east-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ca-central-1'
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
  console.log('Testing regions...');
  for (const region of regions) {
    const ok = await tryRegion(region);
    if (ok) {
      console.log(`Found active region: ${region}`);
      break;
    }
  }
}

run();
