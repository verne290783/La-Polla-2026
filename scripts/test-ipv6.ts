import { Client } from 'pg';

async function run() {
  const client = new Client({
    host: '2600:1f16:c40:6e00:91a0:11a1:a4d1:640c',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'LaPolla2026',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to IPv6 address...');
    await client.connect();
    console.log('CONNECTED successfully to IPv6!');
    await client.end();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
