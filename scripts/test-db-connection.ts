import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const host = 'db.eidfwvezvzpvcgqnijhm.supabase.co';
const port = 5432;
const database = 'postgres';
const user = 'postgres';
const password = process.env.SUPABASE_DB_PASSWORD || 'LaPolla2026';

async function run() {
  console.log('Connecting to database...');
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
    console.log('Connected successfully!');
    const res = await client.query(`
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = 'compute_points';
    `);
    if (res.rows.length > 0) {
      console.log('Function compute_points definition:');
      console.log(res.rows[0].routine_definition);
    } else {
      console.log('Function compute_points not found.');
    }
  } catch (err: any) {
    console.error('Error querying:', err.message);
  } finally {
    await client.end();
  }
}

run();
