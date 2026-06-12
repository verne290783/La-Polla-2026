import dns from 'dns';

// Clean/Set PG env vars before importing pg
process.env.PGUSER = 'postgres.eidfwvezvzpvcgqnijhm';
process.env.PGPASSWORD = 'LaPolla2026';
delete process.env.PGDATABASE;
delete process.env.PGHOST;
delete process.env.PGPORT;

import { Client } from 'pg';

// Setup custom DNS resolver
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
      if (err) {
        originalLookup(hostname, opts, cb);
      } else {
        if (addresses && addresses.length > 0) {
          if (opts && opts.all) {
            cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
          } else {
            cb(null, addresses[0], 4);
          }
        } else {
          originalLookup(hostname, opts, cb);
        }
      }
    });
  } else {
    originalLookup(hostname, opts, cb);
  }
};

async function run() {
  const connectionString = 'postgresql://postgres.eidfwvezvzpvcgqnijhm:LaPolla2026@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  console.log('Connecting via connectionString...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully via connectionString!');
    const res = await client.query('SELECT current_user;');
    console.log('Current user:', res.rows[0]);
    await client.end();
  } catch (err: any) {
    console.error('Connection failed:', err.message || err);
  }
}

run();
