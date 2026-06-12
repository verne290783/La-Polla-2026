import { Client } from 'pg';

async function run() {
  const host = 'aws-0-us-east-1.pooler.supabase.com';
  const port = 6543;
  const user = 'postgres';
  const database = 'postgres';
  const password = 'LaPolla2026';

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    options: 'project=eidfwvezvzpvcgqnijhm',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    console.log('Connecting with options project=ref...');
    await client.connect();
    console.log('CONNECTED successfully using options!');
    await client.end();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
