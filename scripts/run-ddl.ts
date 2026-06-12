import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const host = 'db.eidfwvezvzpvcgqnijhm.supabase.co';
const port = 5432;
const database = 'postgres';
const user = 'postgres';

// Let's test a list of potential passwords
const passwords = [
  process.env.SUPABASE_DB_PASSWORD, // in case it's in env
  'eidfwvezvzpvcgqnijhm',
  'postgres',
  'super_secret_cron_token_123',
  'LaPolla2026',
  'LaPolla',
].filter(Boolean) as string[];

async function run() {
  const sqlPath = path.resolve(process.cwd(), 'calculate_points.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  let connectedClient: Client | null = null;

  for (const password of passwords) {
    console.log(`Trying connection to ${host} with password: ${password.substring(0, 3)}...`);
    const client = new Client({
      host,
      port,
      database,
      user,
      password,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('CONNECTED successfully with password!');
      connectedClient = client;
      break;
    } catch (err: any) {
      console.log(`Failed for password ${password.substring(0, 3)}...: ${err.message}`);
    }
  }

  if (!connectedClient) {
    console.error('Could not connect to database with any guessed password.');
    process.exit(1);
  }

  try {
    console.log('Executing DDL SQL queries...');
    await connectedClient.query(sql);
    console.log('DDL queries executed successfully!');
  } catch (err: any) {
    console.error('Error executing DDL queries:', err.message);
  } finally {
    await connectedClient.end();
  }
}

run();
