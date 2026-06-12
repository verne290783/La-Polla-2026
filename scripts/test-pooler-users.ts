import { Client } from 'pg';

const users = [
  'postgres.eidfwvezvzpvcgqnijhm',
  'postgres@eidfwvezvzpvcgqnijhm',
  'eidfwvezvzpvcgqnijhm.postgres',
  'eidfwvezvzpvcgqnijhm',
  'postgres'
];

async function tryUser(user: string) {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user,
    password: 'LaPolla2026',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`SUCCESS for user ${user}!`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`Failed for user ${user}: ${err.message}`);
    return false;
  }
}

async function run() {
  for (const user of users) {
    await tryUser(user);
  }
}

run();
