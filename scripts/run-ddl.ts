import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup custom DNS resolver to bypass restricted network dns.lookup
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = function (hostname: string, options: any, callback: any) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  if (hostname && (hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co'))) {
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        originalLookup(hostname, opts, cb);
      } else {
        if (opts && opts.all) {
          cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
        } else {
          cb(null, addresses[0], 4);
        }
      }
    });
  } else {
    originalLookup(hostname, opts, cb);
  }
};

async function run() {
  const sqlPath = path.resolve(process.cwd(), 'calculate_points.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    host: 'aws-1-us-east-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.eidfwvezvzpvcgqnijhm',
    password: 'LaPolla2026',
    ssl: {
      servername: 'db.eidfwvezvzpvcgqnijhm.supabase.co',
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('CONNECTED successfully to database!');

    console.log('Executing DDL SQL queries...');
    await client.query(sql);
    console.log('DDL queries executed successfully!');
  } catch (err: any) {
    console.error('Error executing DDL queries:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
