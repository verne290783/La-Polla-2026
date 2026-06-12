import { Client } from 'pg';

const gcpRegions = [
  'us-central1',
  'europe-west3',
  'asia-northeast1'
];

async function tryGcpRegion(region: string) {
  const host = `gcp-0-${region}.pooler.supabase.com`;
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
      console.log(`>>> SUCCESS GCP: Region ${region}, Port ${port} connected!`);
      await client.end();
    } catch (err: any) {
      if (err.message.includes('tenant/user') && err.message.includes('not found')) {
        // Ignore
      } else {
        console.log(`GCP Region ${region}, Port ${port}: ${err.message}`);
      }
    }
  }
}

async function run() {
  console.log('Testing GCP pooler hosts...');
  for (const region of gcpRegions) {
    await tryGcpRegion(region);
  }
  console.log('GCP test complete.');
}

run();
