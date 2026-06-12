import { Client } from 'pg';

async function run() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.eidfwvezvzpvcgqnijhm',
    password: 'LaPolla2026',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    console.log('Connecting to pooler...');
    await client.connect();
    console.log('Connected!');
    await client.end();
  } catch (err: any) {
    console.log('Error object:', err);
    console.log('Error code:', err.code);
    console.log('Error message:', err.message);
  }
}

run();
