import { Client } from 'pg';

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-south-1',
  'eu-south-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ap-south-2',
  'me-central-1',
  'me-south-1',
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
      connectionTimeoutMillis: 2000
    });

    try {
      await client.connect();
      console.log(`>>> SUCCESS: Region ${region}, Port ${port} connected!`);
      await client.end();
    } catch (err: any) {
      if (err.message.includes('tenant/user') && err.message.includes('not found')) {
        // Ignore to reduce noise
      } else {
        console.log(`Region ${region}, Port ${port}: ${err.message}`);
      }
    }
  }
}

async function run() {
  console.log('Scanning all regions without halting...');
  for (const region of regions) {
    await tryRegion(region);
  }
  console.log('Scan complete.');
}

run();
