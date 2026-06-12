import { Client } from 'pg';

const timeoutRegions = [
  'us-west-1',
  'ap-southeast-1',
  'ap-northeast-2'
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
      connectionTimeoutMillis: 10000
    });

    try {
      console.log(`Trying ${region} on port ${port}...`);
      await client.connect();
      console.log(`>>> SUCCESS: Region ${region}, Port ${port} connected!`);
      await client.end();
    } catch (err: any) {
      console.log(`Region ${region}, Port ${port}: ${err.message}`);
    }
  }
}

async function run() {
  for (const region of timeoutRegions) {
    await tryRegion(region);
  }
}

run();
