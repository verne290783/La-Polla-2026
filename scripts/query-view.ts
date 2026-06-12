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
    console.log('Connected!');
    
    console.log('\n--- 1. Querying global_leaderboard_view definition ---');
    const res = await client.query(`
      SELECT view_definition 
      FROM information_schema.views 
      WHERE table_name = 'global_leaderboard_view';
    `);
    if (res.rows.length > 0) {
      console.log(res.rows[0].view_definition);
    } else {
      console.log('global_leaderboard_view not found in information_schema.');
    }

    console.log('\n--- 2. Querying sample rows from global_leaderboard_view ---');
    const rowsRes = await client.query(`
      SELECT * FROM global_leaderboard_view LIMIT 10;
    `);
    console.log(JSON.stringify(rowsRes.rows, null, 2));

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
