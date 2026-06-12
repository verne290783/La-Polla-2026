import { Client } from 'pg';
import dns from 'dns';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
  const client = new Client({
    host: 'aws-1-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.eidfwvezvzpvcgqnijhm',
    password: process.env.SUPABASE_DB_PASSWORD || 'LaPolla2026',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const funcs = ['admin_unlock_user_p1', 'admin_lock_user_p1', 'recalculate_all_points'];
    for (const f of funcs) {
      console.log(`\n--- Function Definition for ${f} ---`);
      const res = await client.query(`
        SELECT pg_get_functiondef(p.oid) as def
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = $1;
      `, [f]);
      if (res.rows.length > 0) {
        console.log(res.rows[0].def);
      } else {
        console.log('NOT FOUND');
      }
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
