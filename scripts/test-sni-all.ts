import { Client } from 'pg';

const combinations = [
  { port: 5432, servername: 'db.eidfwvezvzpvcgqnijhm.supabase.co' },
  { port: 6543, servername: 'db.eidfwvezvzpvcgqnijhm.supabase.co' },
  { port: 5432, servername: 'eidfwvezvzpvcgqnijhm.supabase.co' },
  { port: 6543, servername: 'eidfwvezvzpvcgqnijhm.supabase.co' }
];

async function tryCombo(port: number, servername: string) {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port,
    database: 'postgres',
    user: 'postgres',
    password: 'LaPolla2026',
    ssl: {
      servername,
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });

  try {
    console.log(`Trying port ${port} with servername ${servername}...`);
    await client.connect();
    console.log(`>>> SUCCESS: Connected on port ${port} with servername ${servername}!`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`Failed: ${err.message}`);
    return false;
  }
}

async function run() {
  for (const combo of combinations) {
    const ok = await tryCombo(combo.port, combo.servername);
    if (ok) break;
  }
}

run();
